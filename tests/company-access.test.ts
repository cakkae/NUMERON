import { describe, expect, it } from "vitest";
import { companiesVisibleToUser } from "../src/lib/company-access";

const companies = [
  { id: "company-a", name: "Alfa Demo d.o.o.", vatNumber: "440000000001" },
  { id: "company-b", name: "Beta Demo d.o.o.", vatNumber: "440000000002" },
];

describe("company isolation", () => {
  it("does not return company B to a user assigned only to company A", () => {
    const visible = companiesVisibleToUser(companies, [{ userId: "user-a", companyId: "company-a" }], "user-a");
    expect(visible).toEqual([companies[0]]);
    expect(visible).not.toContainEqual(companies[1]);
  });
});
