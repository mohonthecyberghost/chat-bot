import React from 'react';
import Markdown from 'react-markdown';
import userIcon from '/user-icon.png';
import chatbotIcon from '/chatbot-icon.png';
import thinkingGif from '/chatbot-thinking.gif';
import remarkGfm from 'remark-gfm';

const ChatArea = ({ data, streamdiv, answer, loading, expandedMessages, onReadMore, loadingFullResponses }) => {
    const getIconForRole = (role) => {
        switch (role) {
            case 'user':
                return '/user-icon.png';
            case 'model':
                return '/chatbot-icon.png';
            case 'bot':
            case 'assistant':
                return chatbotIcon;
            default:
                return chatbotIcon;
        }
    };

    return (
        <div className="chat-area">
            {data?.length === 0 ? (
                <div className="welcome-area">
                    <p className="welcome-1">Hi,</p>
                    <p className="welcome-2">How can I help you today?</p>
                </div>
            ) : null}

            {data?.map((element, index) => (
                <div key={index} className={element.role}>
                    <img
                        src={getIconForRole(element.role)}
                        alt={`${element.role} icon`}
                        className="chat-icon"
                    />
                    <div className="message-content">
                        <Markdown remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <React.Fragment {...props} />
                            }}
                        >
                            {typeof element.parts[0] === 'string'
                                ? element.parts[0]
                                : element.parts[0]?.text || ''}
                        </Markdown>

                        {element.role === 'model' && !expandedMessages.has(index) && (
                            <div className="read-more">
                                <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    onReadMore(index);
                                }}>
                                    Read more...
                                </a>
                            </div>
                        )}

                        {element.role === 'model' && loadingFullResponses.has(index) && (
                            <div className="loading-full-response">
                                <div className="spinner"></div>
                                <p>Loading full response...</p>
                            </div>
                        )}

                        {element.role === 'model' && expandedMessages.has(index) && element.fullReply && (
                            <>
                                <hr className="message-divider" />
                                <Markdown remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <React.Fragment {...props} />
                                    }}
                                >
                                    {element.fullReply}
                                </Markdown>
                            </>
                        )}

                        {element.role === 'user' && element.imageUrl && (
                            <div className="uploaded-image">
                                <img
                                    src={element.imageUrl}
                                    alt="Uploaded"
                                    style={{
                                        maxWidth: '300px',
                                        borderRadius: '8px',
                                        marginTop: '8px'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Show either loading indicator OR streaming response, but not both */}
            {loading && !streamdiv && (
                <div className="loading-indicator">
                    <img
                        src={chatbotIcon}
                        alt="AI icon"
                        className="chat-icon"
                    />
                    <div className="message-content">
                        <img
                            src="/chatbot-thinking.gif"
                            alt="Loading"
                            className="thinking-gif"
                        />
                    </div>
                </div>
            )}

            {streamdiv && (
                <div className="tempResponse">
                    <img src={chatbotIcon} alt="AI icon" className="chat-icon" />
                    <div className="message-content">
                        <Markdown remarkPlugins={[remarkGfm]}
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
