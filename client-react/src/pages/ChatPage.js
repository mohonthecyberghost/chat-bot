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
  const [pdfFile, setPdfFile] = useState(null);

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

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0] || null);
  };

  const handlePdfChange = (e) => {
    setPdfFile(e.target.files[0] || null);
  };

  const handleClick = () => {
    const text = inputRef.current.value.trim();
    if (!text && !imageFile && !pdfFile) return;

    if (imageFile || pdfFile) {
      handleNonStreamingChat(text);
    } else if (is_stream) {
      handleStreamingChat();
    } else {
      handleNonStreamingChat(text);
    }
  };

  const handleStreamingChat = async () => {
    const text = inputRef.current.value.trim();
    if (!text && !imageFile && !pdfFile) return;

    const token = localStorage.getItem("token");

    // Create the user's message object
    const userMsg = { role: "user", parts: [] };
    if (text) userMsg.parts.push({ text });
    if (imageFile) {
      userMsg.imageUrl = URL.createObjectURL(imageFile);
      userMsg.parts.push({ text: "📷 Image uploaded" });
    }
    if (pdfFile) {
      userMsg.parts.push({ text: "📄 PDF uploaded" });
    }

    // Optimistically update UI
    const updatedData = [...data, userMsg];
    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      setWaiting(true);
      setAnswer("");
      showStreamdiv(true);
    });
    executeScroll();

    // Prepare FormData for stream
    const formData = new FormData();
    formData.append("user_input", text);
    if (imageFile) formData.append("image", imageFile);
    if (pdfFile) formData.append("pdf", pdfFile);

    try {
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
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
            setImageFile(null);
            setPdfFile(null);
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


  const handleNonStreamingChat = async (text) => {
    const userMsg = { role: "user", parts: [] };
    if (text) userMsg.parts.push({ text });

    if (imageFile) {
      userMsg.imageUrl = URL.createObjectURL(imageFile);
      userMsg.parts.push({ text: "📷 Image uploaded" });
    }

    if (pdfFile) {
      userMsg.parts.push({ text: "📄 PDF uploaded" });
    }

    const updatedData = [...data, userMsg];
    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      setWaiting(true);
    });
    executeScroll();

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("user_input", text);
      if (imageFile) formData.append("image", imageFile);
      if (pdfFile) formData.append("pdf", pdfFile);

      const res = await axios.post(url, formData, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const reply = res.data.reply;
      const modelMsg = { role: "model", parts: [{ text: reply }] };

      flushSync(() => {
        setData(prev => [...prev, modelMsg]);
        setImageFile(null);
        setPdfFile(null);
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

  // ...handleStreamingChat remains unchanged...

  return (
      <center>
        <div className="chat-app">
          <Header toggled={toggled} setToggled={setToggled} />
          <ConversationDisplayArea
              data={data}
              streamdiv={streamdiv}
              answer={answer}
              loading={waiting}
          />
          <MessageInput
              inputRef={inputRef}
              waiting={waiting}
              handleClick={handleClick}
              handleFileChange={handleFileChange}
              handlePdfChange={handlePdfChange}
          />
        </div>
      </center>
  );
}

export default ChatPage;