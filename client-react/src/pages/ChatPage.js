import React, { useRef, useState } from 'react';
import axios from 'axios';
import { flushSync } from 'react-dom';

import '../App.css';

import ConversationDisplayArea from '../components/ConversationDisplayArea.js';
import Header from '../components/Header.js';
import MessageInput from '../components/MessageInput.js';



function ChatPage() {
  const inputRef = useRef();
  const host = "http://localhost:9000";
  const url = host + "/chat";
  const streamUrl = host + "/stream";

  const [data, setData] = useState([]);
  const [answer, setAnswer] = useState("");
  const [streamdiv, showStreamdiv] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const is_stream = toggled;

  function executeScroll() {
    const element = document.getElementById('checkpoint');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function validationCheck(str) {
    return str === null || str.match(/^\s*$/) !== null;
  }

  const handleClickOld = async () => {
    if (!inputRef.current.value.trim()) return;

    const userMsg = {
      role: "user",
      parts: [{ text: inputRef.current.value }]
    };
    const updatedData = [...data, userMsg];

    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      setWaiting(true);
    });

    try {
      //const res = await axios.post(url, { user_input: userMsg.parts[0].text });

      const token = localStorage.getItem("token");
      const res = await axios.post(url, { user_input: userMsg.parts[0].text }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const reply = res.data.reply;
      const modelMsg = {
        role: "model",
        parts: [{ text: reply }]
      };
      setData(prev => [...prev, modelMsg]);
    } catch (err) {
      setData(prev => [...prev, { role: "model", parts: [{ text: "Error occurred." }] }]);
    }
    setWaiting(false);
  };



  const handleClick = () => {
    if (validationCheck(inputRef.current.value)) {
      console.log("Empty or invalid entry");
    } else {

      console.log("is_stream : "+is_stream);

      if (!is_stream) {
        handleNonStreamingChat();
      } else {
        handleStreamingChat();
      }
    }
  };

  // Convert frontend chat format to Gemini backend format
  const toGeminiFormat = (chatHistory) => {
    return chatHistory.map(msg => ({
      role: msg.role,
      parts: msg.parts.map(p => typeof p === 'string' ? p : p.text)
    }));
  };

  const handleNonStreamingChat = async () => {
    if (!inputRef.current.value.trim()) return;

    const userMsg = {
      role: "user",
      parts: [{ text: inputRef.current.value }]
    };
    const updatedData = [...data, userMsg];

    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
    });

    executeScroll();

    try {
      //const res = await axios.post(url, { user_input: userMsg.parts[0].text });

      const token = localStorage.getItem("token");
      const res = await axios.post(url, { user_input: userMsg.parts[0].text }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const reply = res.data.reply;
      const modelMsg = {
        role: "model",
        parts: [{ text: reply }]
      };
      //setData(prev => [...prev, modelMsg]);

      flushSync(() => {
        setData(prev => [...prev, modelMsg]);
        inputRef.current.placeholder = "Enter a message.";
        setWaiting(false);
      });
      executeScroll();


    } catch (err) {
      setData(prev => [...prev, { role: "model", parts: [{ text: "Error occurred." }] }]);
    }
    setWaiting(false);
  };

  const handleStreamingChat = async () => {
    if (!inputRef.current.value.trim()) return;

    const userMessage = inputRef.current.value;
    const token = localStorage.getItem("token");

    const frontendUserMsg = {
      role: "user",
      parts: [{ text: userMessage }]
    };

    const updatedData = [...data, frontendUserMsg];

    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
      setAnswer("");
    });

    executeScroll();

    const requestBody = {
      chat: userMessage,
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok || !response.body) {
        throw new Error("Streaming failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      showStreamdiv(true);

      const readChunk = async () => {
        const { value, done } = await reader.read();
        if (done) {
          showStreamdiv(false);
          flushSync(() => {
            const modelMsg = {
              role: "model",
              parts: [{ text: fullResponse }]
            };
            setData(prev => [...prev, modelMsg]);
            setWaiting(false);
            inputRef.current.placeholder = "Enter a message.";
          });
          return;
        }

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setAnswer(prev => prev + chunk);
        executeScroll();
        await readChunk(); // Recursively read next chunk
      };

      await readChunk();

    } catch (error) {
      console.error("Streaming error:", error);
      flushSync(() => {
        setData(prev => [...prev, {
          role: "model",
          parts: [{ text: "Streaming error occurred." }]
        }]);
        setWaiting(false);
        inputRef.current.placeholder = "Enter a message.";
        showStreamdiv(false);
      });
    }
  };



  const handleStreamingChatOld = async () => {
    const userMessage = inputRef.current.value;

    const frontendUserMsg = {
      role: "user",
      parts: [{ text: userMessage }]
    };

    const updatedData = [...data, frontendUserMsg];

    flushSync(() => {
      setData(updatedData);
      inputRef.current.value = "";
      inputRef.current.placeholder = "Waiting for model's response";
      setWaiting(true);
    });

    executeScroll();

    const requestBody = {
      chat: userMessage,
      history: toGeminiFormat(data)
    };

    try {
      setAnswer("");
      const response = await fetch(streamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let modelResponse = "";

      showStreamdiv(true);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setAnswer(prev => prev + chunk);
        modelResponse += chunk;
        executeScroll();
      }

      showStreamdiv(false);

      const frontendModelMsg = {
        role: "model",
        parts: [{ text: modelResponse }]
      };

      flushSync(() => {
        setData([...updatedData, frontendModelMsg]);
        setWaiting(false);
        inputRef.current.placeholder = "Enter a message.";
      });

    } catch (err) {
      console.error("Streaming error:", err);
      flushSync(() => {
        setData([...updatedData, {
          role: "model",
          parts: [{ text: "Error occurred." }]
        }]);
        setWaiting(false);
        inputRef.current.placeholder = "Enter a message.";
        showStreamdiv(false);
      });
    }
  };

  return (
    <center>
      <div className="chat-app">
        <Header toggled={toggled} setToggled={setToggled} />
        <ConversationDisplayArea data={data} streamdiv={streamdiv} answer={answer} />
        <MessageInput inputRef={inputRef} waiting={waiting} handleClick={handleClick} />
      </div>
    </center>
  );
}


export default ChatPage;