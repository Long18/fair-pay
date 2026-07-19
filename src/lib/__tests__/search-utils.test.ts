import { describe, expect, it } from "vitest";
import {
  matchesSearchFields,
  matchesSearchText,
  normalizeSearchText,
} from "@/lib/search-utils";

describe("normalizeSearchText", () => {
  it("strips Vietnamese diacritics", () => {
    expect(normalizeSearchText("Bùi Phúc")).toBe("bui phuc");
    expect(normalizeSearchText("Nguyễn Anh")).toBe("nguyen anh");
    expect(normalizeSearchText("Đức")).toBe("duc");
  });

  it("is case-insensitive", () => {
    expect(normalizeSearchText("BUI")).toBe("bui");
  });
});

describe("matchesSearchText", () => {
  it("matches query without diacritics against accented names", () => {
    expect(matchesSearchText("Bùi Phúc", "Bui")).toBe(true);
    expect(matchesSearchText("Bùi Phúc", "phuc")).toBe(true);
    expect(matchesSearchText("Bùi Phúc", "bui phuc")).toBe(true);
  });

  it("matches đ/Đ as d", () => {
    expect(matchesSearchText("Đức Minh", "duc")).toBe(true);
    expect(matchesSearchText("đức minh", "Duc Minh")).toBe(true);
  });

  it("returns false when there is no overlap", () => {
    expect(matchesSearchText("Bùi Phúc", "Nguyen")).toBe(false);
  });

  it("treats empty needle as match-all", () => {
    expect(matchesSearchText("Anyone", "   ")).toBe(true);
  });
});

describe("matchesSearchFields", () => {
  it("matches any field after diacritic folding", () => {
    expect(matchesSearchFields("Bui", "Bùi Phúc", "other@example.com")).toBe(true);
    expect(matchesSearchFields("phuc", null, "Bùi Phúc")).toBe(true);
    expect(matchesSearchFields("missing", "Bùi", "x@y.com")).toBe(false);
  });

  it("treats empty needle as match-all", () => {
    expect(matchesSearchFields("  ", "Anyone")).toBe(true);
  });
});
