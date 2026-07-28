/* eslint-disable no-console */
import {
  PrismaClient,
  type BodyType,
  type CampaignChannel,
  type FuelType,
  type LeadSource,
  type LeadStage,
  type LeadTemperature,
  type Prisma,
  type Role,
  type Transmission,
  type VehicleStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness
//
// A seeded generator keeps the demo dataset byte-identical between runs, so
// screenshots, tests and review environments all show the same numbers.
// ---------------------------------------------------------------------------

let rngState = 42;
function random(): number {
  rngState = (rngState * 1_664_525 + 1_013_904_223) % 4_294_967_296;
  return rngState / 4_294_967_296;
}
function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}
function pickMany<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
}
function chance(probability: number): boolean {
  return random() < probability;
}
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 3_600_000);
}

const CAR_PHOTOS = [
  "photo-1552519507-da3b142c6e3d",
  "photo-1503376780353-7e6692767b70",
  "photo-1494976388531-d1058494cdd8",
  "photo-1568605117036-5fe5e7bab0b7",
  "photo-1541899481282-d53bffe3c35d",
  "photo-1502877338535-766e1452684a",
  "photo-1555215695-3004980ad54e",
  "photo-1549317661-bd32c8ce0db2",
  "photo-1550355291-bbee04a92027",
  "photo-1533473359331-0135ef1b58bf",
  "photo-1580273916550-e323be2ae537",
  "photo-1605559424843-9e4c228bf1c2",
  "photo-1606664515524-ed2f786a0bd6",
  "photo-1617469767053-d3b523a0b982",
  "photo-1544636331-e26879cd4d9b",
  "photo-1502161254066-6c74afbf07aa",
];

function photoUrl(index: number, width = 1400): string {
  const id = CAR_PHOTOS[index % CAR_PHOTOS.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

type CatalogueEntry = {
  brand: string;
  model: string;
  version: string;
  bodyType: BodyType;
  fuel: FuelType;
  transmission: Transmission;
  /** Retail price band in cents. */
  price: [number, number];
};

const CATALOGUE: CatalogueEntry[] = [
  { brand: "Honda", model: "Civic", version: "2.0 EXL CVT", bodyType: "SEDAN", fuel: "FLEX", transmission: "CVT", price: [11_500_000, 14_900_000] },
  { brand: "Toyota", model: "Corolla", version: "2.0 XEi", bodyType: "SEDAN", fuel: "FLEX", transmission: "CVT", price: [12_900_000, 16_500_000] },
  { brand: "Jeep", model: "Compass", version: "1.3 T270 Longitude", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [14_500_000, 19_900_000] },
  { brand: "Volkswagen", model: "T-Cross", version: "1.4 TSI Highline", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [11_900_000, 15_500_000] },
  { brand: "Hyundai", model: "Creta", version: "1.0 TGDI Platinum", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [12_500_000, 16_900_000] },
  { brand: "Chevrolet", model: "Onix", version: "1.0 Turbo Premier", bodyType: "HATCH", fuel: "FLEX", transmission: "AUTOMATIC", price: [7_500_000, 9_800_000] },
  { brand: "Hyundai", model: "HB20", version: "1.0 Turbo Platinum", bodyType: "HATCH", fuel: "FLEX", transmission: "AUTOMATIC", price: [7_200_000, 9_500_000] },
  { brand: "Fiat", model: "Toro", version: "2.0 Diesel Volcano 4x4", bodyType: "PICKUP", fuel: "DIESEL", transmission: "AUTOMATIC", price: [15_500_000, 21_000_000] },
  { brand: "Toyota", model: "Hilux", version: "2.8 SRX 4x4", bodyType: "PICKUP", fuel: "DIESEL", transmission: "AUTOMATIC", price: [27_000_000, 36_000_000] },
  { brand: "Ford", model: "Ranger", version: "3.0 V6 Limited", bodyType: "PICKUP", fuel: "DIESEL", transmission: "AUTOMATIC", price: [29_000_000, 38_000_000] },
  { brand: "Nissan", model: "Kicks", version: "1.6 Advance CVT", bodyType: "SUV", fuel: "FLEX", transmission: "CVT", price: [9_800_000, 12_500_000] },
  { brand: "Honda", model: "HR-V", version: "1.5 Turbo Touring", bodyType: "SUV", fuel: "FLEX", transmission: "CVT", price: [14_000_000, 18_500_000] },
  { brand: "Jeep", model: "Renegade", version: "1.3 T270 Sport", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [10_500_000, 13_900_000] },
  { brand: "BMW", model: "320i", version: "2.0 M Sport", bodyType: "SEDAN", fuel: "GASOLINE", transmission: "AUTOMATIC", price: [24_000_000, 32_000_000] },
  { brand: "Audi", model: "A3", version: "1.4 TFSI Sedan", bodyType: "SEDAN", fuel: "GASOLINE", transmission: "DUAL_CLUTCH", price: [19_000_000, 26_000_000] },
  { brand: "Mercedes-Benz", model: "C180", version: "1.6 Avantgarde", bodyType: "SEDAN", fuel: "GASOLINE", transmission: "AUTOMATIC", price: [22_000_000, 30_000_000] },
  { brand: "Volvo", model: "XC40", version: "1.5 T5 Recharge", bodyType: "SUV", fuel: "HYBRID", transmission: "AUTOMATIC", price: [26_000_000, 34_000_000] },
  { brand: "Volkswagen", model: "Polo", version: "1.0 TSI Comfortline", bodyType: "HATCH", fuel: "FLEX", transmission: "AUTOMATIC", price: [7_800_000, 10_500_000] },
  { brand: "Chevrolet", model: "Tracker", version: "1.2 Turbo Premier", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [11_000_000, 14_500_000] },
  { brand: "Renault", model: "Kwid", version: "1.0 Intense", bodyType: "HATCH", fuel: "FLEX", transmission: "MANUAL", price: [4_900_000, 6_500_000] },
  { brand: "Fiat", model: "Argo", version: "1.3 Drive", bodyType: "HATCH", fuel: "FLEX", transmission: "MANUAL", price: [6_200_000, 8_200_000] },
  { brand: "Toyota", model: "SW4", version: "2.8 SRX 7 Lugares", bodyType: "SUV", fuel: "DIESEL", transmission: "AUTOMATIC", price: [33_000_000, 45_000_000] },
  { brand: "BYD", model: "Dolphin", version: "Mini GL", bodyType: "HATCH", fuel: "ELECTRIC", transmission: "AUTOMATIC", price: [11_500_000, 14_500_000] },
  { brand: "GWM", model: "Haval H6", version: "1.5 HEV", bodyType: "SUV", fuel: "HYBRID", transmission: "AUTOMATIC", price: [17_500_000, 22_000_000] },
  { brand: "Porsche", model: "Macan", version: "2.0 Turbo", bodyType: "SUV", fuel: "GASOLINE", transmission: "DUAL_CLUTCH", price: [42_000_000, 58_000_000] },
  { brand: "Volkswagen", model: "Nivus", version: "1.0 TSI Highline", bodyType: "SUV", fuel: "FLEX", transmission: "AUTOMATIC", price: [10_500_000, 13_500_000] },
];

const COLORS = ["Preto", "Branco", "Prata", "Cinza", "Vermelho", "Azul", "Verde"];

const ACCESSORIES = [
  "Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas",
  "Airbag duplo", "Freios ABS", "Central multimídia", "Câmera de ré",
  "Sensor de estacionamento", "Piloto automático", "Bancos em couro",
  "Teto solar", "Rodas de liga leve", "Faróis de LED", "Controle de tração",
  "Apple CarPlay / Android Auto",
];

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nathan", "Olívia", "Paulo",
  "Rafaela", "Sérgio", "Tatiane", "Vinícius", "Yasmin", "Otávio", "Camila", "Rodrigo",
];
const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Almeida",
  "Costa", "Gomes", "Martins", "Araújo", "Barbosa", "Ribeiro", "Carvalho", "Pereira",
];

function personName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function phoneNumber(): string {
  return `119${randomInt(10_000_000, 99_999_999)}`;
}
function emailFor(name: string): string {
  const [first, last] = name.toLowerCase().split(" ");
  const domain = pick(["gmail.com", "outlook.com", "hotmail.com", "uol.com.br"]);
  return `${slugify(first)}.${slugify(last)}${randomInt(1, 99)}@${domain}`;
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱  Seeding Revend CRM…");

  // A clean slate every run. Order respects foreign keys; cascades cover the
  // rest via the Organization delete.
  await db.organization.deleteMany({});

  const passwordHash = await bcrypt.hash("Revend@2026", 12);

  const organization = await db.organization.create({
    data: {
      name: "Revend Motors",
      slug: "revend-motors",
      legalName: "Revend Comércio de Veículos LTDA",
      taxId: "12.345.678/0001-90",
      email: "contato@revendmotors.com.br",
      phone: "1140028922",
      whatsapp: "11987654321",
      addressLine: "Av. Brigadeiro Faria Lima, 2200",
      city: "São Paulo",
      state: "SP",
      postalCode: "01452-000",
      brandColor: "#6D4AFF",
      instagramUrl: "https://instagram.com/revendmotors",
      facebookUrl: "https://facebook.com/revendmotors",
      websiteSettings: {
        create: {
          heroHeadline: "Seminovos premium, com procedência de verdade.",
          heroSubheadline:
            "Cada veículo passa por 120 pontos de inspeção, tem histórico completo e sai com garantia de 12 meses.",
          heroImageUrl: photoUrl(1, 1920),
          heroCtaLabel: "Ver estoque disponível",
          aboutTitle: "Uma revenda que joga limpo",
          aboutBody:
            "Desde 2014 ajudamos famílias e empresas a comprar com segurança. Sem letra miúda, sem taxa escondida e sem carro com passado duvidoso — se não passaria para a nossa família, não vendemos para a sua.",
          metaTitle: "Revend Motors — Seminovos premium em São Paulo",
          metaDescription:
            "Seminovos revisados com garantia de 12 meses, laudo cautelar e financiamento aprovado na hora. Confira o estoque da Revend Motors.",
          published: true,
        },
      },
    },
  });

  // -- Team ----------------------------------------------------------------

  const teamSpec: {
    name: string;
    email: string;
    role: Role;
    jobTitle: string;
    commissionRate: number;
  }[] = [
    { name: "Marina Duarte", email: "owner@revend.com", role: "OWNER", jobTitle: "Sócia-fundadora", commissionRate: 0 },
    { name: "Ricardo Menezes", email: "admin@revend.com", role: "ADMIN", jobTitle: "Diretor de operações", commissionRate: 0 },
    { name: "Patrícia Lopes", email: "gerente@revend.com", role: "MANAGER", jobTitle: "Gerente comercial", commissionRate: 1 },
    { name: "Thiago Moraes", email: "thiago@revend.com", role: "SALESPERSON", jobTitle: "Consultor de vendas", commissionRate: 2.5 },
    { name: "Juliana Prado", email: "juliana@revend.com", role: "SALESPERSON", jobTitle: "Consultora de vendas", commissionRate: 2.5 },
    { name: "André Nogueira", email: "andre@revend.com", role: "SALESPERSON", jobTitle: "Consultor de vendas", commissionRate: 2.2 },
    { name: "Contabilidade Vega", email: "financeiro@revend.com", role: "VIEWER", jobTitle: "Contabilidade externa", commissionRate: 0 },
  ];

  const team = [];
  for (const spec of teamSpec) {
    team.push(
      await db.user.create({
        data: {
          organizationId: organization.id,
          name: spec.name,
          email: spec.email,
          passwordHash,
          role: spec.role,
          jobTitle: spec.jobTitle,
          commissionRate: spec.commissionRate,
          phone: phoneNumber(),
          lastLoginAt: daysAgo(randomInt(0, 4)),
        },
      }),
    );
  }

  const sellers = team.filter((u) => u.role === "SALESPERSON");
  const manager = team.find((u) => u.role === "MANAGER")!;
  const owner = team.find((u) => u.role === "OWNER")!;
  const salesCapable = [...sellers, manager];

  console.log(`   ✓ ${team.length} usuários`);

  // -- Inventory -----------------------------------------------------------

  const currentYear = new Date().getFullYear();
  const vehicles = [];

  for (let i = 0; i < 34; i++) {
    const entry = CATALOGUE[i % CATALOGUE.length];
    const year = randomInt(currentYear - 6, currentYear);
    const modelYear = chance(0.6) ? year + 1 : year;

    const price = randomInt(entry.price[0], entry.price[1]);
    // Dealers buy at roughly 78–88% of the retail ask.
    const cost = Math.round(price * (randomInt(78, 88) / 100));
    const minPrice = Math.round(price * (randomInt(92, 97) / 100));

    // The first 22 units stay in stock; the rest become sales history.
    const isSold = i >= 22;
    const status: VehicleStatus = isSold
      ? "SOLD"
      : i < 16
        ? "AVAILABLE"
        : i < 19
          ? "RESERVED"
          : "PENDING";

    const purchasedAt = daysAgo(isSold ? randomInt(40, 260) : randomInt(1, 130));
    const title = `${entry.brand} ${entry.model} ${entry.version}`;

    const vehicle = await db.vehicle.create({
      data: {
        organizationId: organization.id,
        slug: `${slugify(`${entry.brand} ${entry.model} ${entry.version}`)}-${year}-${i.toString().padStart(3, "0")}`,
        brand: entry.brand,
        model: entry.model,
        version: entry.version,
        year,
        modelYear,
        mileage: randomInt(5_000, 95_000),
        transmission: entry.transmission,
        fuel: entry.fuel,
        bodyType: entry.bodyType,
        color: pick(COLORS),
        doors: entry.bodyType === "PICKUP" || entry.bodyType === "COUPE" ? 2 : 4,
        engine: entry.version.split(" ")[0],
        plate: `${pick(["ABC", "DEF", "GHI", "JKL", "MNO"])}${randomInt(1, 9)}${pick(["A", "B", "C", "D"])}${randomInt(10, 99)}`,
        description: `${title} em excelente estado de conservação. Revisões em dia, laudo cautelar aprovado e garantia de 12 meses. Aceitamos seu usado na troca e financiamos em até 60 meses.`,
        accessories: pickMany(ACCESSORIES, randomInt(5, 11)),
        costCents: cost,
        minPriceCents: minPrice,
        priceCents: price,
        status,
        featured: i < 4,
        published: true,
        purchasedAt,
        soldAt: isSold ? daysAgo(randomInt(1, 220)) : null,
        viewCount: randomInt(12, 940),
        createdById: pick(salesCapable).id,
        assignedToId: pick(sellers).id,
        images: {
          create: Array.from({ length: randomInt(3, 5) }).map((_, idx) => ({
            url: photoUrl(i + idx),
            alt: `${title} — foto ${idx + 1}`,
            position: idx,
            isCover: idx === 0,
          })),
        },
        expenses: {
          create: pickMany(
            [
              { description: "Revisão completa", category: "RECONDITIONING" as const, amountCents: randomInt(80_000, 260_000) },
              { description: "Polimento e higienização", category: "RECONDITIONING" as const, amountCents: randomInt(40_000, 120_000) },
              { description: "Transferência e documentação", category: "DOCUMENTATION" as const, amountCents: randomInt(50_000, 150_000) },
              { description: "Transporte do veículo", category: "TRANSPORT" as const, amountCents: randomInt(30_000, 90_000) },
            ],
            randomInt(1, 3),
          ).map((e) => ({
            organizationId: organization.id,
            description: e.description,
            category: e.category,
            amountCents: e.amountCents,
            incurredAt: new Date(purchasedAt.getTime() + 3 * 86_400_000),
          })),
        },
      },
    });

    vehicles.push(vehicle);
  }

  const soldVehicles = vehicles.filter((v) => v.status === "SOLD");
  const stockVehicles = vehicles.filter((v) => v.status !== "SOLD");
  console.log(`   ✓ ${vehicles.length} veículos (${stockVehicles.length} em estoque)`);

  // -- Campaigns -----------------------------------------------------------

  const campaignSpec: {
    name: string;
    channel: CampaignChannel;
    budget: number;
    dailySpend: [number, number];
  }[] = [
    { name: "Search — Seminovos SP", channel: "GOOGLE_ADS", budget: 1_800_000, dailySpend: [18_000, 42_000] },
    { name: "Performance Max — SUVs", channel: "GOOGLE_ADS", budget: 1_200_000, dailySpend: [12_000, 32_000] },
    { name: "Meta — Remarketing estoque", channel: "META_ADS", budget: 900_000, dailySpend: [9_000, 24_000] },
    { name: "Meta — Lançamento picapes", channel: "META_ADS", budget: 700_000, dailySpend: [7_000, 19_000] },
    { name: "Marketplace — Destaque premium", channel: "MARKETPLACE", budget: 400_000, dailySpend: [4_000, 9_000] },
  ];

  const campaigns = [];
  for (const spec of campaignSpec) {
    const campaign = await db.campaign.create({
      data: {
        organizationId: organization.id,
        name: spec.name,
        channel: spec.channel,
        status: "ACTIVE",
        startDate: daysAgo(180),
        budgetCents: spec.budget,
      },
    });

    // 120 days of daily metrics per campaign.
    const metrics: Prisma.CampaignMetricCreateManyInput[] = [];
    for (let d = 119; d >= 0; d--) {
      const date = new Date(daysAgo(d).setUTCHours(0, 0, 0, 0));
      const spend = randomInt(spec.dailySpend[0], spec.dailySpend[1]);
      const impressions = randomInt(1_800, 9_500);
      const clicks = Math.round(impressions * (randomInt(15, 48) / 1000));
      const leads = Math.max(0, Math.round(clicks * (randomInt(30, 110) / 1000)));
      const sales = chance(0.22) ? randomInt(0, 2) : 0;

      metrics.push({
        campaignId: campaign.id,
        date,
        spendCents: spend,
        impressions,
        clicks,
        leads,
        sales,
        revenueCents: sales * randomInt(9_000_000, 22_000_000),
      });
    }
    await db.campaignMetric.createMany({ data: metrics });
    campaigns.push(campaign);
  }
  console.log(`   ✓ ${campaigns.length} campanhas com 120 dias de métricas`);

  // -- Leads ---------------------------------------------------------------

  const STAGE_DISTRIBUTION: LeadStage[] = [
    ...Array<LeadStage>(14).fill("NEW"),
    ...Array<LeadStage>(12).fill("CONTACTED"),
    ...Array<LeadStage>(9).fill("VISIT_SCHEDULED"),
    ...Array<LeadStage>(8).fill("NEGOTIATION"),
    ...Array<LeadStage>(6).fill("PROPOSAL"),
    ...Array<LeadStage>(14).fill("WON"),
    ...Array<LeadStage>(9).fill("LOST"),
  ];

  const SOURCES: LeadSource[] = [
    "WEBSITE", "WEBSITE", "WHATSAPP", "WHATSAPP", "GOOGLE_ADS",
    "META_ADS", "INSTAGRAM", "PHONE", "WALK_IN", "REFERRAL", "MARKETPLACE",
  ];
  const TEMPERATURES: LeadTemperature[] = ["COLD", "WARM", "WARM", "HOT"];

  const LOST_REASONS = [
    "Comprou em outra loja",
    "Crédito não aprovado",
    "Achou o preço alto",
    "Desistiu da compra",
    "Sem retorno após 3 tentativas",
  ];

  const wonLeads: { id: string; vehicleId: string | null; sellerId: string }[] = [];
  const leadIds: string[] = [];

  for (let i = 0; i < STAGE_DISTRIBUTION.length; i++) {
    const stage = STAGE_DISTRIBUTION[i];
    const name = personName();
    const seller = pick(sellers);
    const createdAt = daysAgo(randomInt(0, 150));
    const isWon = stage === "WON";
    const isLost = stage === "LOST";

    // Won leads are tied to a sold unit; everyone else eyes live stock.
    const interestVehicle = isWon
      ? soldVehicles[i % soldVehicles.length]
      : chance(0.75)
        ? pick(stockVehicles)
        : null;

    const lastContactAt =
      stage === "NEW" && chance(0.6)
        ? null
        : new Date(createdAt.getTime() + randomInt(1, 10) * 86_400_000);

    const source = pick(SOURCES);
    const fromAds = source === "GOOGLE_ADS" || source === "META_ADS";

    const lead = await db.lead.create({
      data: {
        organizationId: organization.id,
        name,
        email: emailFor(name),
        phone: phoneNumber(),
        source,
        stage,
        temperature: isWon ? "HOT" : pick(TEMPERATURES),
        score: randomInt(20, 95),
        position: i,
        budgetCents: chance(0.7)
          ? randomInt(6_000_000, 30_000_000)
          : null,
        notes: chance(0.4)
          ? "Cliente pediu simulação de financiamento em 48x com entrada de 30%."
          : null,
        tradeInDescription: chance(0.35)
          ? `${pick(CATALOGUE).brand} ${pick(CATALOGUE).model} ${randomInt(2012, 2020)}`
          : null,
        tradeInValueCents: chance(0.35) ? randomInt(2_500_000, 9_000_000) : null,
        interestVehicleId: interestVehicle?.id ?? null,
        assignedToId: seller.id,
        campaignId: fromAds
          ? pick(campaigns.filter((c) =>
              source === "GOOGLE_ADS"
                ? c.channel === "GOOGLE_ADS"
                : c.channel === "META_ADS",
            )).id
          : null,
        utmSource: fromAds ? (source === "GOOGLE_ADS" ? "google" : "facebook") : null,
        utmMedium: fromAds ? "cpc" : null,
        createdAt,
        lastContactAt,
        nextFollowUpAt:
          !isWon && !isLost && chance(0.55)
            ? hoursFromNow(randomInt(-72, 96))
            : null,
        wonAt: isWon ? new Date(createdAt.getTime() + randomInt(3, 25) * 86_400_000) : null,
        lostAt: isLost ? new Date(createdAt.getTime() + randomInt(5, 30) * 86_400_000) : null,
        lostReason: isLost ? pick(LOST_REASONS) : null,
      },
    });

    leadIds.push(lead.id);
    if (isWon && interestVehicle) {
      wonLeads.push({ id: lead.id, vehicleId: interestVehicle.id, sellerId: seller.id });
    }

    // Timeline
    const activities: Prisma.LeadActivityUncheckedCreateInput[] = [
      {
        organizationId: organization.id,
        leadId: lead.id,
        userId: seller.id,
        type: "SYSTEM",
        content: `Lead recebido via ${source.toLowerCase().replace("_", " ")}.`,
        createdAt,
      },
    ];

    if (stage !== "NEW") {
      activities.push({
        organizationId: organization.id,
        leadId: lead.id,
        userId: seller.id,
        type: pick(["CALL", "WHATSAPP", "EMAIL"] as const),
        content: "Primeiro contato realizado. Cliente demonstrou interesse real.",
        createdAt: new Date(createdAt.getTime() + 86_400_000),
      });
    }
    if (["NEGOTIATION", "PROPOSAL", "WON"].includes(stage)) {
      activities.push({
        organizationId: organization.id,
        leadId: lead.id,
        userId: seller.id,
        type: "PROPOSAL_SENT",
        content: "Proposta enviada com simulação de financiamento.",
        createdAt: new Date(createdAt.getTime() + 5 * 86_400_000),
      });
    }
    if (isWon) {
      activities.push({
        organizationId: organization.id,
        leadId: lead.id,
        userId: seller.id,
        type: "STAGE_CHANGE",
        content: "Negócio fechado.",
        metadata: { from: "PROPOSAL", to: "WON" },
        createdAt: new Date(createdAt.getTime() + 12 * 86_400_000),
      });
    }

    await db.leadActivity.createMany({ data: activities });

    // Open tasks for live pipeline
    if (!isWon && !isLost && chance(0.5)) {
      await db.task.create({
        data: {
          organizationId: organization.id,
          title: pick([
            "Ligar para confirmar visita",
            "Enviar simulação de financiamento",
            "Retornar contato do WhatsApp",
            "Verificar aprovação de crédito",
            "Enviar fotos adicionais do veículo",
          ]),
          priority: pick(["LOW", "MEDIUM", "HIGH", "URGENT"] as const),
          dueAt: hoursFromNow(randomInt(-48, 120)),
          assignedToId: seller.id,
          leadId: lead.id,
        },
      });
    }
  }
  console.log(`   ✓ ${leadIds.length} leads com timeline e tarefas`);

  // -- Sales ---------------------------------------------------------------

  // Every sold unit gets a sale; won leads are matched to theirs where possible.
  const leadByVehicle = new Map(wonLeads.map((l) => [l.vehicleId!, l]));

  for (const vehicle of soldVehicles) {
    const matched = leadByVehicle.get(vehicle.id);
    const seller = matched
      ? team.find((u) => u.id === matched.sellerId)!
      : pick(sellers);

    const expenses = await db.vehicleExpense.aggregate({
      where: { vehicleId: vehicle.id },
      _sum: { amountCents: true },
    });

    const discount = chance(0.55) ? randomInt(50_000, 400_000) : 0;
    const salePrice = vehicle.priceCents - discount;
    const totalCost = vehicle.costCents + (expenses._sum.amountCents ?? 0);

    await db.sale.create({
      data: {
        organizationId: organization.id,
        vehicleId: vehicle.id,
        leadId: matched?.id ?? null,
        sellerId: seller.id,
        salePriceCents: salePrice,
        costCents: totalCost,
        discountCents: discount,
        commissionCents: Math.round(salePrice * (seller.commissionRate / 100)),
        paymentMethod: pick(["FINANCING", "FINANCING", "CASH", "TRADE_IN", "MIXED", "PIX"] as const),
        customerName: personName(),
        customerPhone: phoneNumber(),
        soldAt: vehicle.soldAt ?? daysAgo(randomInt(1, 200)),
      },
    });
  }
  console.log(`   ✓ ${soldVehicles.length} vendas registradas`);

  // -- Appointments --------------------------------------------------------

  const appointmentCount = 26;
  for (let i = 0; i < appointmentCount; i++) {
    const seller = pick(sellers);
    const vehicle = pick(stockVehicles);
    const type = pick(["VISIT", "TEST_DRIVE", "CALL", "DELIVERY", "MEETING"] as const);
    // Spread across last two weeks and next three.
    const startsAt = hoursFromNow(randomInt(-14 * 24, 21 * 24));
    startsAt.setMinutes(pick([0, 30]), 0, 0);

    await db.appointment.create({
      data: {
        organizationId: organization.id,
        title: {
          VISIT: "Visita à loja",
          TEST_DRIVE: `Test drive — ${vehicle.brand} ${vehicle.model}`,
          CALL: "Ligação de acompanhamento",
          DELIVERY: "Entrega do veículo",
          MEETING: "Reunião de negociação",
        }[type],
        type,
        status:
          startsAt < new Date()
            ? pick(["COMPLETED", "COMPLETED", "NO_SHOW", "CANCELED"] as const)
            : pick(["SCHEDULED", "CONFIRMED"] as const),
        startsAt,
        endsAt: new Date(startsAt.getTime() + randomInt(1, 3) * 1_800_000),
        location: type === "CALL" ? null : "Showroom — Faria Lima",
        assignedToId: seller.id,
        leadId: pick(leadIds),
        vehicleId: vehicle.id,
      },
    });
  }
  console.log(`   ✓ ${appointmentCount} compromissos na agenda`);

  // -- Goals ---------------------------------------------------------------

  const now = new Date();
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const period = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthOffset, 1),
    );

    await db.goal.create({
      data: {
        organizationId: organization.id,
        type: "ORGANIZATION",
        period,
        targetRevenueCents: 180_000_000,
        targetProfitCents: 28_000_000,
        targetUnits: 14,
      },
    });

    for (const seller of sellers) {
      await db.goal.create({
        data: {
          organizationId: organization.id,
          type: "USER",
          userId: seller.id,
          period,
          targetRevenueCents: 55_000_000,
          targetProfitCents: 8_500_000,
          targetUnits: 5,
        },
      });
    }
  }
  console.log("   ✓ metas da loja e por vendedor (3 meses)");

  // -- Achievements --------------------------------------------------------

  const achievementSpec = [
    { key: "first_sale", label: "Primeira venda", tier: "bronze" },
    { key: "ten_sales", label: "10 vendas fechadas", tier: "silver" },
    { key: "goal_hit", label: "Meta batida no mês", tier: "gold" },
    { key: "fast_closer", label: "Fechou em menos de 7 dias", tier: "silver" },
  ];
  for (const seller of sellers) {
    for (const spec of pickMany(achievementSpec, randomInt(2, 4))) {
      await db.achievement.create({
        data: {
          userId: seller.id,
          key: spec.key,
          label: spec.label,
          tier: spec.tier,
          earnedAt: daysAgo(randomInt(5, 120)),
        },
      });
    }
  }

  // -- Website CMS ---------------------------------------------------------

  await db.testimonial.createMany({
    data: [
      { organizationId: organization.id, authorName: "Fernanda Ribeiro", authorRole: "Comprou um Jeep Compass", content: "Segunda vez que compro na Revend. Transparência total no laudo e o carro chegou impecável. Recomendo de olhos fechados.", rating: 5, position: 0 },
      { organizationId: organization.id, authorName: "Marcos Aurélio", authorRole: "Comprou uma Toyota Hilux", content: "Negociação rápida, sem enrolação. Aceitaram meu usado por um valor justo e aprovaram o financiamento no mesmo dia.", rating: 5, position: 1 },
      { organizationId: organization.id, authorName: "Letícia Campos", authorRole: "Comprou um Honda Civic", content: "O atendimento fez diferença. Me mostraram inclusive os pontos que precisavam de atenção — isso é raro.", rating: 5, position: 2 },
      { organizationId: organization.id, authorName: "Eduardo Tavares", authorRole: "Comprou um VW T-Cross", content: "Comprei à distância, recebi vídeo detalhado do carro e a entrega foi pontual. Experiência muito acima da média.", rating: 4, position: 3 },
    ],
  });

  await db.service.createMany({
    data: [
      { organizationId: organization.id, title: "Laudo cautelar completo", description: "Todo veículo passa por 120 pontos de inspeção e vistoria cautelar independente antes de entrar no estoque.", icon: "ShieldCheck", position: 0 },
      { organizationId: organization.id, title: "Financiamento aprovado na hora", description: "Trabalhamos com 8 bancos parceiros e simulamos a melhor taxa em minutos, sem compromisso.", icon: "Landmark", position: 1 },
      { organizationId: organization.id, title: "Aceitamos seu usado", description: "Avaliação justa e transparente do seu carro atual, com abatimento imediato no valor da compra.", icon: "Repeat", position: 2 },
      { organizationId: organization.id, title: "Garantia de 12 meses", description: "Cobertura de motor e câmbio por 12 meses em toda a rede credenciada do país.", icon: "BadgeCheck", position: 3 },
    ],
  });

  await db.faqItem.createMany({
    data: [
      { organizationId: organization.id, question: "Vocês aceitam meu carro na troca?", answer: "Sim. Avaliamos seu veículo gratuitamente e o valor é abatido diretamente na compra. A avaliação leva cerca de 30 minutos na loja.", position: 0 },
      { organizationId: organization.id, question: "Qual a garantia dos veículos?", answer: "Todos os seminovos saem com 12 meses de garantia de motor e câmbio, válida em toda a rede credenciada nacional.", position: 1 },
      { organizationId: organization.id, question: "Posso financiar sem entrada?", answer: "Trabalhamos com planos de até 60 meses e, dependendo da análise de crédito, é possível financiar até 100% do valor.", position: 2 },
      { organizationId: organization.id, question: "Vocês vendem para outros estados?", answer: "Sim. Cuidamos de toda a documentação e organizamos o transporte com seguro até a sua cidade.", position: 3 },
      { organizationId: organization.id, question: "Posso agendar um test drive?", answer: "Claro. Agende pelo WhatsApp ou pelo site e deixamos o veículo separado e higienizado para você.", position: 4 },
    ],
  });

  await db.sitePage.create({
    data: {
      organizationId: organization.id,
      slug: "sobre",
      title: "Sobre a Revend Motors",
      content:
        "<p>Somos uma revenda independente fundada em 2014 em São Paulo. Nosso princípio é simples: só vendemos o carro que colocaríamos a nossa própria família dentro.</p><p>Hoje somos mais de 20 profissionais entre consultores, mecânicos e equipe de documentação, com mais de 4.000 famílias atendidas.</p>",
      seoTitle: "Sobre a Revend Motors — quem somos",
      seoDescription:
        "Conheça a história da Revend Motors, revenda de seminovos premium em São Paulo desde 2014.",
    },
  });

  // -- Notifications & audit ----------------------------------------------

  await db.notification.createMany({
    data: [
      { organizationId: organization.id, userId: owner.id, type: "GOAL_REACHED", title: "Meta de outubro atingida", body: "A loja bateu 104% da meta de faturamento.", link: "/goals" },
      { organizationId: organization.id, userId: owner.id, type: "STOCK_AGING", title: "3 veículos com mais de 90 dias", body: "Capital parado em unidades paradas há mais de 90 dias.", link: "/reports" },
      { organizationId: organization.id, userId: manager.id, type: "LEAD_ASSIGNED", title: "5 novos leads sem atendimento", body: "Leads aguardando primeiro contato há mais de 24h.", link: "/crm" },
      { organizationId: organization.id, userId: manager.id, type: "VEHICLE_SOLD", title: "Nova venda registrada", body: "Thiago fechou um Jeep Compass 1.3 T270.", link: "/reports", read: true },
    ],
  });

  await db.auditLog.createMany({
    data: [
      { organizationId: organization.id, userId: owner.id, action: "auth.login", entity: "User", entityId: owner.id, ipAddress: "189.4.20.11" },
      { organizationId: organization.id, userId: manager.id, action: "vehicle.create", entity: "Vehicle", entityId: vehicles[0].id, ipAddress: "189.4.20.42" },
      { organizationId: organization.id, userId: manager.id, action: "settings.update", entity: "Organization", entityId: organization.id, ipAddress: "189.4.20.42" },
    ],
  });

  console.log("   ✓ site, notificações e auditoria");
  console.log("\n✅  Seed concluído.\n");
  console.log("    Acesse com qualquer um destes usuários (senha: Revend@2026):");
  for (const spec of teamSpec) {
    console.log(`      ${spec.role.padEnd(12)} ${spec.email}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌  Seed falhou:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
