import { useState } from 'react';

const EmailUploader: React.FC = () => {
    const [email, setSenderEmail] = useState<string | null>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const emlContent = e.target?.result as string;
                const extractedEmail = extractSenderEmail(emlContent);
                setSenderEmail(extractedEmail);
            };
            reader.readAsText(file);
        }
    };

    const extractSenderEmail = (emlContent: string): string | null => {
        const emailRegex = /From:.*<([^>]+)>/;
        const match = emailRegex.exec(emlContent);
        return match ? match[1] : null;
    };

    return (
        <div>
            <h2>Upload .eml File</h2>
            <input type="file" accept=".eml" onChange={handleFileUpload} />
            {email && (
                <div>
                    <h3>Sender Email:</h3>
                    <p>{email}</p>
                </div>
            )}
        </div>
    );
};

export default EmailUploader;
