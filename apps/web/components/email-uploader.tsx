import { useState } from 'react';

/* import {verifyEmail} from 'zk-email-o1js/src/email-verify'; */
import { generateInputs } from 'zk-email-o1js/build/src/generate-inputs.js';


const asd = generateInputs('email');



const EmailUploader: React.FC = () => {
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [inputText, setInputText] = useState<string>('');

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const emlContent = e.target?.result as string;
                const extractedName = extractCustomerId(emlContent);
                setCustomerId(extractedName);
            };
            reader.readAsText(file);
        }
    };

    const extractCustomerId = (emlContent: string): string | null => {
        const customerIdRegex = /cust=(\d+)&/;
        const match = customerIdRegex.exec(emlContent);
        return match ? match[1] : null;
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(event.target.value);
    };

    return (
        <div>
            <h2>Upload .eml File</h2>
            <input type="file" accept=".eml" onChange={handleFileUpload} />
            <div>
                <h3>Filter Text (cust ID):</h3>
                <input type="text" value={inputText} onChange={handleInputChange} />
            </div>
            {customerId && (
                <div>
                    <h3>Parsed Customer Id:</h3>
                    <p>{customerId}</p>
                </div>
            )}
        </div>
    );
};

export default EmailUploader;
