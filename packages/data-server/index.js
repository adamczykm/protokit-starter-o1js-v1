"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_request_1 = require("graphql-request");
// Define the GraphQL endpoint
const endpoint = 'http://localhost:8080/graphql';
// Create a new GraphQL client
const client = new graphql_request_1.GraphQLClient(endpoint);
// Define a GraphQL query
const query = (0, graphql_request_1.gql) `
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
    .then(data => console.log(data))
    .catch(error => console.error(error));
