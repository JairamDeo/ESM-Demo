/** Official required-document checklists for Identity & Personal case types (casetype1–6). */

export interface RequiredDocSeedItem {
  label: string;
  text: string;
  isMandatory?: boolean;
  sortOrder: number;
}

export interface RequiredDocSeedEntry {
  caseTypeSlug: string;
  documents: RequiredDocSeedItem[];
  questions?: string[];
  guidelines?: string[];
  note?: string;
}

const DEFAULT_GUIDELINES = [
  "Ensure all details match your supporting documents.",
  "Upload clear and self-attested documents.",
  "Accepted formats: PDF, JPG, JPEG, PNG.",
  "Maximum file size: 5 MB per document.",
  "Additional documents may be requested during verification.",
];

const DEFAULT_NOTE =
  "Please keep all required documents ready before raising the grievance. They will be requested during the filing process.";

export const IDENTITY_PERSONAL_REQUIRED_DOCUMENTS: RequiredDocSeedEntry[] = [
  {
    caseTypeSlug: "casetype1",
    documents: [
      {
        label: "(a)",
        sortOrder: 0,
        text: "Self-attested copy of either PAN Card / Matriculation Certificate / Passport / ECHS Card / Driving License / Election ID Card / Aadhaar Card",
      },
      {
        label: "(b)",
        sortOrder: 1,
        text: "Declaration on non-judicial stamp paper regarding correct date of birth. Format attached at Appx 'A'.",
      },
      {
        label: "(c)",
        sortOrder: 2,
        text: "In case of children, certificate of birth from the registrar / Municipal authority / local panchayat / head of recognised school if he/she is studying in such a school / Board of Education",
      },
    ],
  },
  {
    caseTypeSlug: "casetype2",
    documents: [
      {
        label: "(a)",
        sortOrder: 0,
        text: "Personal application by retired personnel",
      },
      {
        label: "(b)",
        sortOrder: 1,
        text: "Gazette Notification — only for officers, Honorary Commissioned Officer and JCO equivalent ranks. For ORs: affidavit from first class magistrate along with newspaper advertisement in English newspaper",
      },
      {
        label: "(c)",
        sortOrder: 2,
        text: "Newspaper cutting of two National dailies",
      },
      {
        label: "(d)",
        sortOrder: 3,
        text: "Copies of PAN Card and Aadhaar Card (self-attested)",
      },
      {
        label: "(e)",
        sortOrder: 4,
        text: "PPO / Discharge Book",
      },
      {
        label: "(f)",
        sortOrder: 5,
        text: "Any bonafide mistake will be rectified in accordance with the commissioning letter / enrolment form when no change in name is sought. Format at Appendix 'D'",
      },
    ],
  },
  {
    caseTypeSlug: "casetype3",
    documents: [
      {
        label: "(a)",
        sortOrder: 0,
        text: "Personnel application",
      },
      {
        label: "(b)",
        sortOrder: 1,
        text: "Copies of PAN Card and Aadhaar Card (self-attested)",
      },
      {
        label: "(c)",
        sortOrder: 2,
        text: "An affidavit by 1st class magistrate substantiating the change of surname including spelling error in name. Format attached at Appx 'B'.",
      },
    ],
    note: "Additional / Amendment in surname including error in name — provided pronunciations remain the same for dependents of retired person.",
  },
  {
    caseTypeSlug: "casetype4",
    documents: [
      {
        label: "(a)",
        sortOrder: 0,
        text: "Personnel application",
      },
      {
        label: "(b)",
        sortOrder: 1,
        text: "Copies of PAN Card and Aadhaar Card (self-attested)",
      },
      {
        label: "(c)",
        sortOrder: 2,
        text: "An affidavit by 1st class magistrate substantiating the change of main (first) and middle name. Format attached at Appx 'B'.",
      },
      {
        label: "(d)",
        sortOrder: 3,
        text: "Newspaper cutting of minimum two national dailies. Format attached at Appx 'C'.",
      },
    ],
    note: "If the middle name appears as an initial on your Aadhaar Card or PAN Card, it must be expanded to the full name.",
  },
  {
    caseTypeSlug: "casetype5",
    documents: [
      {
        label: "(a)",
        sortOrder: 0,
        text: "Aadhaar Card (Original)",
      },
    ],
  },
  {
    caseTypeSlug: "casetype6",
    documents: [
      { label: "(a)", sortOrder: 0, text: "NOC from other children" },
      { label: "(b)", sortOrder: 1, text: "Unmarried Certificate / Unemployed Certificate" },
      { label: "(c)", sortOrder: 2, text: "Birth Certificate, Matriculation Certificate" },
      { label: "(d)", sortOrder: 3, text: "PPO / Discharge Book" },
      { label: "(e)", sortOrder: 4, text: "Three passport-size photographs" },
      { label: "(f)", sortOrder: 5, text: "Death certificate — Father and Mother" },
      { label: "(g)", sortOrder: 6, text: "Aadhaar Card, PAN Card" },
      {
        label: "(h)",
        sortOrder: 7,
        text: "Life Time Arrears (LTA) Certificate by Pension Disbursing Office",
      },
      { label: "(i)", sortOrder: 8, text: "Bank passbook" },
    ],
    note: "For unmarried, divorced and unemployed daughter pension start.",
  },
];

export function withDefaultGuidelines(entry: RequiredDocSeedEntry): RequiredDocSeedEntry {
  return {
    ...entry,
    guidelines: entry.guidelines ?? DEFAULT_GUIDELINES,
    note: entry.note ?? DEFAULT_NOTE,
  };
}

export const IDENTITY_PERSONAL_REQUIRED_DOCUMENTS_RESOLVED: RequiredDocSeedEntry[] =
  IDENTITY_PERSONAL_REQUIRED_DOCUMENTS.map(withDefaultGuidelines);
