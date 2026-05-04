import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import '../styles/stealth.css';

const StealthMode = () => {
  const [displayValue, setDisplayValue] = useState('0');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const triggerCode = "911=";

  const handleKeyPress = (key) => {
    let newValue = displayValue === '0' ? key : displayValue + key;
    setDisplayValue(newValue);

    // Check for stealth trigger
    if (newValue.endsWith(triggerCode)) {
      triggerStealthSOS();
      setDisplayValue('Error'); // Mask the trigger
    }
  };

  const clearDisplay = () => {
    setDisplayValue('0');
  };

  const triggerStealthSOS = async () => {
    if (isRecording) return;
    
    // Very subtle toast to not alert attackers but inform the user
    toast.success('System Active', {
      style: {
        background: '#333',
        color: '#fff',
        fontSize: '12px'
      },
      icon: '🔒'
    });

    try {
      // Start recording video and audio silently
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('evidenceFile', blob, `stealth_evidence_${Date.now()}.webm`);
        formData.append('triggerType', 'StealthCalculator');

        try {
          await axios.post('http://localhost:5000/api/v1/evidence', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          toast.success('Evidence stored securely.');
        } catch (error) {
          console.error("Failed to upload evidence:", error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Record for 15 seconds, then stop and upload.
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
        }
      }, 15000);

    } catch (err) {
      console.error("Camera/Mic access denied", err);
      toast.error("Permissions denied.");
    }
  };

  return (
    <div className="stealth-container">
      <div className="calculator-wrapper">
        <div className="calculator-display">
          <span className="calculator-text">
            {displayValue.length > 9 ? displayValue.substring(displayValue.length - 9) : displayValue}
          </span>
        </div>
        
        <div className="calculator-grid">
          <button onClick={clearDisplay} className="calc-btn btn-light-gray span-2">AC</button>
          <button onClick={() => handleKeyPress('%')} className="calc-btn btn-light-gray">%</button>
          <button onClick={() => handleKeyPress('/')} className="calc-btn btn-orange">÷</button>

          <button onClick={() => handleKeyPress('7')} className="calc-btn btn-gray">7</button>
          <button onClick={() => handleKeyPress('8')} className="calc-btn btn-gray">8</button>
          <button onClick={() => handleKeyPress('9')} className="calc-btn btn-gray">9</button>
          <button onClick={() => handleKeyPress('*')} className="calc-btn btn-orange">×</button>

          <button onClick={() => handleKeyPress('4')} className="calc-btn btn-gray">4</button>
          <button onClick={() => handleKeyPress('5')} className="calc-btn btn-gray">5</button>
          <button onClick={() => handleKeyPress('6')} className="calc-btn btn-gray">6</button>
          <button onClick={() => handleKeyPress('-')} className="calc-btn btn-orange">−</button>

          <button onClick={() => handleKeyPress('1')} className="calc-btn btn-gray">1</button>
          <button onClick={() => handleKeyPress('2')} className="calc-btn btn-gray">2</button>
          <button onClick={() => handleKeyPress('3')} className="calc-btn btn-gray">3</button>
          <button onClick={() => handleKeyPress('+')} className="calc-btn btn-orange">+</button>

          <button onClick={() => handleKeyPress('0')} className="calc-btn btn-gray span-2">0</button>
          <button onClick={() => handleKeyPress('.')} className="calc-btn btn-gray">.</button>
          <button onClick={() => handleKeyPress('=')} className="calc-btn btn-orange">=</button>
        </div>
      </div>
      
      {isRecording && (
        <div className="recording-indicator"></div>
      )}
    </div>
  );
};

export default StealthMode;
