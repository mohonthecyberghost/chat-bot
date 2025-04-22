/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Import necessary modules. */
import React from 'react';
import { FaPaperPlane, FaImage } from 'react-icons/fa';

const MessageInput = ({ inputRef, waiting, handleClick, handleFileChange }) => {
    const fileInputRef = React.useRef();

    const triggerFilePicker = () => {
        fileInputRef.current.click();
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

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Image upload button */}
            <button className="icon-button" onClick={triggerFilePicker} disabled={waiting} title="Upload Image">
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
