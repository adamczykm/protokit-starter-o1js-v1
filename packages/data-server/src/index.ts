import { GraphQLClient, gql } from 'graphql-request';

// Define the GraphQL endpoint
const endpoint = 'http://localhost:8080/graphql';

// Create a new GraphQL client
const client = new GraphQLClient(endpoint);

// Define a GraphQL query
const query = gql`
  query {
    # Replace with your actual query
    someQuery {
      field1
      field2
    }
  }
`;

// Send the query to the GraphQL API
client.request(query)
  .then((data: any) => console.log(data))
  .catch((error: any) => console.error(error));
