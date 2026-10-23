/**
 * Job titles offered in onboarding. Both spellings are saved as target roles, so a person
 * who picks "Buyer" in English still gets the "For you" boost on Swedish "Inköpare" ads.
 * Grouped so picking one title can suggest its neighbours.
 */
export type TitleOption = { sv: string; en: string; group: string };

export const TITLE_OPTIONS: TitleOption[] = [
  // Logistics & supply chain
  { sv: "Logistikkoordinator", en: "Logistics Coordinator", group: "logistics" },
  { sv: "Logistiker", en: "Logistics Specialist", group: "logistics" },
  { sv: "Lagerarbetare", en: "Warehouse Worker", group: "logistics" },
  { sv: "Truckförare", en: "Forklift Driver", group: "logistics" },
  { sv: "Lagerchef", en: "Warehouse Manager", group: "logistics" },
  { sv: "Transportledare", en: "Transport Coordinator", group: "logistics" },
  { sv: "Supply chain-koordinator", en: "Supply Chain Coordinator", group: "logistics" },
  { sv: "Supply chain-planerare", en: "Supply Chain Planner", group: "logistics" },
  { sv: "Materialplanerare", en: "Material Planner", group: "logistics" },
  { sv: "Logistikanalytiker", en: "Logistics Analyst", group: "logistics" },
  // Purchasing
  { sv: "Inköpare", en: "Buyer", group: "purchasing" },
  { sv: "Strategisk inköpare", en: "Strategic Buyer", group: "purchasing" },
  { sv: "Operativ inköpare", en: "Purchasing Coordinator", group: "purchasing" },
  { sv: "Inköpschef", en: "Purchasing Manager", group: "purchasing" },
  { sv: "Upphandlare", en: "Procurement Officer", group: "purchasing" },
  // Finance & admin
  { sv: "Ekonomiassistent", en: "Accounting Assistant", group: "finance" },
  { sv: "Redovisningsekonom", en: "Accountant", group: "finance" },
  { sv: "Controller", en: "Controller", group: "finance" },
  { sv: "Löneadministratör", en: "Payroll Administrator", group: "finance" },
  { sv: "Administratör", en: "Administrator", group: "finance" },
  { sv: "Projektkoordinator", en: "Project Coordinator", group: "finance" },
  // Sales & customer service
  { sv: "Kundtjänstmedarbetare", en: "Customer Service Representative", group: "sales" },
  { sv: "Säljare", en: "Sales Representative", group: "sales" },
  { sv: "Butikssäljare", en: "Retail Sales Associate", group: "sales" },
  { sv: "Butikschef", en: "Store Manager", group: "sales" },
  { sv: "Key account manager", en: "Key Account Manager", group: "sales" },
  // IT
  { sv: "Systemutvecklare", en: "Software Developer", group: "it" },
  { sv: "Frontendutvecklare", en: "Frontend Developer", group: "it" },
  { sv: "IT-support", en: "IT Support Technician", group: "it" },
  { sv: "Dataanalytiker", en: "Data Analyst", group: "it" },
  { sv: "IT-projektledare", en: "IT Project Manager", group: "it" },
  // Health & care
  { sv: "Undersköterska", en: "Assistant Nurse", group: "care" },
  { sv: "Sjuksköterska", en: "Registered Nurse", group: "care" },
  { sv: "Vårdbiträde", en: "Care Assistant", group: "care" },
  { sv: "Personlig assistent", en: "Personal Assistant (care)", group: "care" },
  { sv: "Barnskötare", en: "Childcare Assistant", group: "care" },
  // Production & trades
  { sv: "Produktionsmedarbetare", en: "Production Worker", group: "production" },
  { sv: "Montör", en: "Assembler", group: "production" },
  { sv: "Elektriker", en: "Electrician", group: "production" },
  { sv: "Snickare", en: "Carpenter", group: "production" },
  { sv: "Produktionsledare", en: "Production Supervisor", group: "production" },
  // Hospitality & cleaning
  { sv: "Kock", en: "Cook", group: "hospitality" },
  { sv: "Servitör", en: "Waiter", group: "hospitality" },
  { sv: "Lokalvårdare", en: "Cleaner", group: "hospitality" },
  // Management
  { sv: "Projektledare", en: "Project Manager", group: "management" },
  { sv: "Verksamhetsutvecklare", en: "Business Developer", group: "management" },
  { sv: "HR-generalist", en: "HR Generalist", group: "management" },
];

/** Shown before anything is picked: one common title from each area. */
export const POPULAR_TITLES = ["Lagerarbetare", "Inköpare", "Ekonomiassistent", "Kundtjänstmedarbetare", "Undersköterska", "Systemutvecklare", "Projektledare", "Logistikkoordinator"];
