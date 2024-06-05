"use client";
import Head from "next/head";
import EmailUploader from "@/components/email-uploader"; // Adjust the path as necessary


export default function Page(): JSX.Element {
  return (
    <div>
      <Head>
        <title>Email Uploader </title>
        <meta name="description" content="Upload and parse .eml files" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
              <h1>Welcome to the Email Uploader</h1>
              <EmailUploader />
      </main>
    </div>
  );
}
