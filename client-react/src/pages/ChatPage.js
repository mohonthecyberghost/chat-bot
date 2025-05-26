import React, { useRef, useState } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';

import '../App.css';

import ConversationDisplayArea from '../components/ConversationDisplayArea.js';
import Header from '../components/Header.js';
import MessageInput from '../components/MessageInput.js';
import Navigation from '../components/Navigation.js';

function ChatPage() {
  const inputRef = useRef();
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [loadingFullResponses, setLoadingFullResponses] = useState(new Set());

  const host = "http://127.0.0.1:8000";
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
      setWaiting(true);  // Show loading indicator
      setAnswer("");     // Clear previous answer
      showStreamdiv(false); // Don't show streaming container yet
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
            setAnswer(""); // Clear the streaming answer
          });
          executeScroll();
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // When we get the first chunk, switch from loading to streaming
        if (!answer) {
          flushSync(() => {
            setWaiting(false);
            showStreamdiv(true);
          });
        }
        
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
        setAnswer(""); // Clear the streaming answer
      });
    }
  };

  const handleReadMore = async (index) => {
    try {
      console.log("Read more clicked for index:", index);
      console.log("Current data:", data);
      
      setLoadingFullResponses(prev => {
        const newSet = new Set(prev);
        newSet.add(index);
        return newSet;
      });

      // Get the user's text from the previous message
      const userText = data[index - 1]?.parts[0]?.text || "";
      console.log("User text:", userText);

      // Calculate the correct message index in the full history
      const fullHistoryIndex = Math.floor(index / 2);
      console.log("Full history index:", fullHistoryIndex);

      const token = localStorage.getItem("token");
      console.log("Sending request for full response with index:", fullHistoryIndex);
      const response = await axios.post(
        `${host}/get_full_response`,
        { 
          message_index: fullHistoryIndex,
          user_input: userText
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("Full response received:", response.data);
      if (response.data.full_reply) {
        setData(prev => {
          const newData = [...prev];
          if (newData[index]) {
            newData[index] = {
              ...newData[index],
              fullReply: response.data.full_reply
            };
          }
          return newData;
        });
      }

      setExpandedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(index);
        return newSet;
      });
    } catch (error) {
      console.error("Error fetching full response:", error);
    } finally {
      setLoadingFullResponses(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
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

      const summary = res.data.reply;
      const fullReply = res.data.full_reply;
      const modelMsg = { 
        role: "model", 
        parts: [{ text: summary }],
        fullReply: fullReply
      };

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

  return (
    <div className="chat-app">
      <Navigation />
      <Header toggled={toggled} setToggled={setToggled} />
      <div className="chat-area">
        <ConversationDisplayArea
          data={data}
          streamdiv={streamdiv}
          answer={answer}
          loading={waiting}
          expandedMessages={expandedMessages}
          loadingFullResponses={loadingFullResponses}
          onReadMore={handleReadMore}
        />
        <div id="checkpoint"></div>
      </div>
      <MessageInput
        inputRef={inputRef}
        handleClick={handleClick}
        handleFileChange={handleFileChange}
        handlePdfChange={handlePdfChange}
        imageFile={imageFile}
        pdfFile={pdfFile}
        waiting={waiting}
      />
    </div>
  );
}

export default ChatPage;