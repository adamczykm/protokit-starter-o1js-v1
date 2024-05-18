import { GraphQLClient } from 'graphql-request';

const endpoint = 'http://localhost:8080/graphql';

export const client = new GraphQLClient(endpoint);
