import { ModulesConfig } from "@proto-kit/common";
import { OrderBook } from "./order-book";
import { UInt64 } from "o1js";
import { Balances } from "@proto-kit/library";

export const modules = {
  Balances,
  OrderBook,
};

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: UInt64.from(10000),
  },
  OrderBook: {
    minTokenAmount: UInt64.from(1),
    maxValidityPeriod: UInt64.from(12*60*24*30),
    lockPeriod: UInt64.from(12 * 60 * 2)
  }
};

export default {
  modules,
  config,
};
