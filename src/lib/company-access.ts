export type Company = {
  id: string;
  name: string;
  vatNumber: string;
};

export type CompanyMembership = {
  companyId: string;
  userId: string;
};

/** Mirrors the access rule enforced authoritatively by Supabase RLS. */
export function companiesVisibleToUser(
  companies: Company[],
  memberships: CompanyMembership[],
  userId: string,
) {
  const companyIds = new Set(
    memberships.filter((membership) => membership.userId === userId).map((membership) => membership.companyId),
  );

  return companies.filter((company) => companyIds.has(company.id));
}
