import React from 'react';
import { FaPaperPlane, FaImage, FaReadme } from 'react-icons/fa';

const MessageInput = ({ inputRef, waiting, handleClick, handleFileChange, handlePdfChange }) => {
    const imageInputRef = React.useRef();
    const pdfInputRef = React.useRef();

    const triggerImagePicker = () => {
        imageInputRef.current.click();
    };

    const triggerPdfPicker = () => {
        pdfInputRef.current.click();
    };

    return (
        <div className="input-area">
            <input
                ref={inputRef}
                className="text-input"
                placeholder={waiting ? "Waiting for response..." : "Enter your message"}
                disabled={waiting}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            />

            {/* Hidden input for PDF */}
            <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                style={{ display: 'none' }}
            />

            {/* Hidden input for image */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* PDF upload button */}
            <button className="icon-button" onClick={triggerPdfPicker} disabled={waiting} title="Upload PDF">
                <FaReadme size={20} />
            </button>

            {/* Image upload button */}
            <button className="icon-button" onClick={triggerImagePicker} disabled={waiting} title="Upload Image">
                <FaImage size={20} />
            </button>

            {/* Send button */}
            <button className="icon-button" onClick={handleClick} disabled={waiting} title="Send">
                <FaPaperPlane size={18} />
            </button>
        </div>
    );
};

export default MessageInput;