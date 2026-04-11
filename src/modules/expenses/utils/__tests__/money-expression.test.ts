import { describe, expect, it } from "vitest";

import {
  hasMoneyExpressionOperator,
  parseMoneyExpression,
} from "../money-expression";

describe("parseMoneyExpression", () => {
  it("parses plain integer expressions", () => {
    expect(parseMoneyExpression("10000+20000")).toMatchObject({
      status: "valid",
      value: 30000,
      normalized: "10000+20000",
    });
  });

  it("parses vi-VN grouped integers before decimal interpretation", () => {
    expect(parseMoneyExpression("10.000+20.000")).toMatchObject({
      status: "valid",
      value: 30000,
      normalized: "10.000+20.000",
    });
  });

  it("parses decimals when the token does not match vi-VN grouping", () => {
    expect(parseMoneyExpression("1.5*2")).toMatchObject({
      status: "valid",
      value: 3,
    });
  });

  it("normalizes multiplication aliases", () => {
    expect(parseMoneyExpression("10x2X3")).toMatchObject({
      status: "valid",
      value: 60,
      normalized: "10*2*3",
    });

    expect(parseMoneyExpression("10×2")).toMatchObject({
      status: "valid",
      value: 20,
      normalized: "10*2",
    });
  });

  it("respects operator precedence", () => {
    expect(parseMoneyExpression("100+20*3")).toMatchObject({
      status: "valid",
      value: 160,
    });
  });

  it("supports unary minus inside the grammar", () => {
    expect(parseMoneyExpression("-50+100")).toMatchObject({
      status: "valid",
      value: 50,
    });
  });

  it("treats trailing operators as incomplete", () => {
    expect(parseMoneyExpression("100+")).toMatchObject({
      status: "incomplete",
      reason: "trailing-operator",
    });
  });

  it("treats dangling minus signs as incomplete", () => {
    expect(parseMoneyExpression("-")).toMatchObject({
      status: "incomplete",
      reason: "dangling-sign",
    });
  });

  it("rejects malformed operator sequences", () => {
    expect(parseMoneyExpression("100++2")).toMatchObject({
      status: "invalid",
      reason: "unexpected-operator",
    });

    expect(parseMoneyExpression("10x/2")).toMatchObject({
      status: "invalid",
      reason: "unexpected-operator",
    });
  });

  it("rejects division by zero", () => {
    expect(parseMoneyExpression("10/0")).toMatchObject({
      status: "invalid",
      reason: "division-by-zero",
    });
  });

  it("rejects malformed numeric tokens", () => {
    expect(parseMoneyExpression("10..000")).toMatchObject({
      status: "invalid",
      reason: "invalid-number",
    });

    expect(parseMoneyExpression("10.000.00+5")).toMatchObject({
      status: "invalid",
      reason: "invalid-number",
    });
  });

  it("rounds floating point output to two decimals", () => {
    expect(parseMoneyExpression("10/3")).toMatchObject({
      status: "valid",
      value: 3.33,
    });
  });

  it("returns empty for blank input", () => {
    expect(parseMoneyExpression("   ")).toMatchObject({
      status: "empty",
      normalized: "",
    });
  });
});

describe("hasMoneyExpressionOperator", () => {
  it("detects arithmetic operators", () => {
    expect(hasMoneyExpressionOperator("10+2")).toBe(true);
    expect(hasMoneyExpressionOperator("10×2")).toBe(true);
    expect(hasMoneyExpressionOperator("10000")).toBe(false);
  });
});
