import React from 'react';
import Markdown from 'react-markdown';
import userIcon from '../assets/user-icon.png';
import chatbotIcon from '../assets/chatbot-icon.png';

const ChatArea = ({ data, streamdiv, answer }) => {
    return (
        <div className="chat-area">
            {data?.length <= 0 ? (
                <div className="welcome-area">
                    <p className="welcome-1">Hi,</p>
                    <p className="welcome-2">How can I help you today?</p>
                </div>
            ) : (
                <div className="welcome-area" style={{ display: 'none' }}></div>
            )}

            {data.map((element, index) => (
                <div key={index} className={element.role}>
                    <img
                        src={element.role === 'user' ? userIcon : chatbotIcon}
                        alt="Icon"
                    />
                    <div className="message-content">
                        <Markdown
                            components={{
                                p: ({ node, ...props }) => <React.Fragment {...props} />
                            }}
                        >
                            {element.parts[0]?.text || element.parts[0]}
                        </Markdown>

                        {element.role === 'user' && element.imageUrl && (
                            <div className="uploaded-image">
                                <img
                                    src={element.imageUrl}
                                    alt="Uploaded"
                                    style={{ maxWidth: '300px', borderRadius: '8px', marginTop: '8px' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {streamdiv && (
                <div className="tempResponse">
                    <img src={chatbotIcon} alt="Icon" />
                    <div className="message-content">
                        <Markdown
                            components={{
                                p: ({ node, ...props }) => <React.Fragment {...props} />
                            }}
                        >
                            {answer}
                        </Markdown>
                    </div>
                </div>
            )}

            <span id="checkpoint"></span>
        </div>
    );
};

export default ChatArea;
