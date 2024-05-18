'use client'; // Enforces client-side rendering

import { useState, useEffect } from 'react';
import { gql } from 'graphql-request';
import { client } from '../../lib/graphql-client';

type SomeQueryData = {
  field1: string;
  field2: string;
};

const QUERY = gql`
  query {
    someQuery {
      field1
      field2
    }
  }
`;

const Page: React.FC = () => {
  const [data, setData] = useState<SomeQueryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await client.request<{ someQuery: SomeQueryData[] }>(QUERY);
        setData(result.someQuery);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Data from GraphQL</h1>
      {data.map((item, index) => (
        <div key={index}>
          <p>Field 1: {item.field1}</p>
          <p>Field 2: {item.field2}</p>
        </div>
      ))}
    </div>
  );
};

export default Page;
