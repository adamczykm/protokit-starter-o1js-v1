import { Balance } from "@proto-kit/library";
import { Balances } from "./balances";
import { ModulesConfig } from "@proto-kit/common";
import { OrderBook } from "./order-book";
import { UInt64 } from "o1js";

export const modules = {
  Balances,
  OrderBook,
};

export const config: ModulesConfig<typeof modules> = {
  Balances: {
    totalSupply: Balance.from(10_000),
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
