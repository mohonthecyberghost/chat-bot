import React, { useRef, useState } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';

import '../App.css';

import ConversationDisplayArea from '../components/ConversationDisplayArea.js';
import Header from '../components/Header.js';
import MessageInput from '../components/MessageInput.js';

function ChatPage() {
  const inputRef = useRef();
  const [imageFile, setImageFile] = useState(null);

  const host = "http://10.88.231.44:8000";
  const url = host + "/chat";
  const streamUrl = host + "/stream";

  const [data, setData] = useState([]);
  const [answer, setAnswer] = useState("");
  const [streamdiv, showStreamdiv] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const is_stream = toggled;

  const executeScroll = () => {
    const el = document.getElementById('checkpoint');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const validationCheck = (str) => {
    return !str || str.match(/^\s*$/);
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0] || null);
  };

  const handleClick = () => {
    const text = inputRef.current.value.trim();
    // Require at least text or image
    if (!text && !imageFile) return;

    // If there's an image, always send non‑streaming (binary + text)
    if (imageFile) {
      handleNonStreamingChat(text);
    } else if (is_stream) {
      handleStreamingChat();
    } else {
      handleNonStreamingChat(text);
    }
  };

  const handleNonStreamingChat = async (text) => {
    // Build the user message including optional image preview
    const userMsg = { role: "user", parts: [] };
    if (text) userMsg.parts.push({ text });
    if (imageFile) {
      userMsg.imageUrl = URL.createObjectURL(imageFile);
      userMsg.parts.push({ text: "📷 Image uploaded" });
    }

    // Optimistically render it
    const updatedData = [...data, userMsg];
    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      setImageFile(null);
      setWaiting(true);
    });
    executeScroll();

    try {
      const token = localStorage.getItem("token");
      let res;

      if (imageFile) {
        // multipart/form-data for file + text
        const formData = new FormData();
        formData.append("user_input", text);
        formData.append("image", imageFile);

        res = await axios.post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        });
      } else {
        // pure JSON text
        res = await axios.post(
            url,
            { user_input: text },
            { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const reply = res.data.reply;
      const modelMsg = { role: "model", parts: [{ text: reply }] };

      flushSync(() => {
        setData(prev => [...prev, modelMsg]);
        setWaiting(false);
      });
      executeScroll();

    } catch (err) {
      flushSync(() => {
        setData(prev => [
          ...prev,
          { role: "model", parts: [{ text: "Error occurred." }] }
        ]);
        setWaiting(false);
      });
    }
  };

  const handleStreamingChat = async () => {
    const text = inputRef.current.value.trim();
    if (!text) return;

    const token = localStorage.getItem("token");
    const frontendUserMsg = { role: "user", parts: [{ text }] };
    const updatedData = [...data, frontendUserMsg];

    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      setWaiting(true);
      setAnswer("");
      showStreamdiv(true);
    });
    executeScroll();

    const requestBody = {
      chat: text,
      history: data.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => (typeof p === 'string' ? p : p.text))
      }))
    };

    try {
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      const readChunk = async () => {
        const { value, done } = await reader.read();
        if (done) {
          showStreamdiv(false);
          const modelMsg = { role: "model", parts: [{ text: fullResponse }] };
          flushSync(() => {
            setData(prev => [...prev, modelMsg]);
            setWaiting(false);
          });
          executeScroll();
          return;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setAnswer(prev => prev + chunk);
        executeScroll();
        await readChunk();
      };

      await readChunk();

    } catch (error) {
      flushSync(() => {
        setData(prev => [
          ...prev,
          { role: "model", parts: [{ text: "Streaming error occurred." }] }
        ]);
        setWaiting(false);
        showStreamdiv(false);
      });
    }
  };

  return (
      <center>
        <div className="chat-app">
          <Header toggled={toggled} setToggled={setToggled} />
          <ConversationDisplayArea
              data={data}
              streamdiv={streamdiv}
              answer={answer}
          />
          <MessageInput
              inputRef={inputRef}
              waiting={waiting}
              handleClick={handleClick}
              handleFileChange={handleFileChange}
          />
        </div>
      </center>
  );
}

export default ChatPage;
