import { renderStudyMarkdown } from "./ebimMarkdown";

export type CurriculumScreen = {
  id: string;
  group: string;
  groupLabel: string;
  nav: string;
  html: string;
};

type Draft = {
  id: string;
  group: string;
  groupLabel: string;
  nav: string;
  markdown: string;
};

const screens: Draft[] = [
  {
    id: "vigencia",
    group: "base",
    groupLabel: "Base",
    nav: "What is current",
    markdown: `## What the series is, and which edition you can use today

ISO 19650 is the international series for managing information about a built asset with BIM. It is not a piece of software, a file format, or a level of detail. Part 1 fixes the vocabulary. Parts 2 and 3 turn that vocabulary into a process: one for design and construction, one for using the asset. Part 4 says how an exchange is judged. Part 5 says how to treat sensitive information. Part 6, from 2025, covers health and safety and is outside this study.

Study the published text, not the draft. On 26 November 2026 the ISO catalogue said the following.

| Document | Published edition | Catalogue status | What comes next |
| --- | --- | --- | --- |
| ISO 19650-1:2018 | Edition 1, 34 pages, December 2018 | 90.92, under revision, and also confirmed in 2024 | ISO/DIS 19650-1, edition 2, stage 40.93 on 18 August 2026 |
| ISO 19650-2:2018 | Edition 1, 26 pages, December 2018 | 90.92, under revision, confirmed in 2024 | ISO/DIS 19650-2, stage 40.93. The catalogue says it will replace Part 2 and also Part 3 |
| ISO 19650-3:2020 | Edition 1, 30 pages, July 2020 | 90.92, under revision, confirmed in 2024 | The same draft as above, and also ISO/DIS 19650-3, stage 40.93 on 16 September 2026 |
| ISO 19650-4:2022 | Edition 1, 12 pages, August 2022 | 60.60, published | The record showed no revision and no amendment |
| ISO 19650-5:2020 | Edition 1, 28 pages, June 2020 | 90.93, confirmed on 24 October 2025 | No replacement draft |

Keep one contradiction in mind. The draft ISO/DIS 19650-2 is titled as an information management process, and its record says it will replace both delivery and operation. Its public abstract still describes only the delivery phase. The draft ISO/DIS 19650-3 is titled as implementation of that process and says it gives guidance in accordance with Part 2. Neither draft was read in full: both are paid and unpublished. Until they are published, the authority is 19650-2:2018 and 19650-3:2020.

In the United Kingdom the series is applied through the IMI Framework, formerly the UK BIM Framework, maintained by nima and BSI. The guidance documents are open commentary. They do not replace the standard. The UK national annex pins down names and codes; that is a local precision, not the international text.

## Sources

- [ISO 19650-1:2018](https://www.iso.org/standard/68078.html)
- [ISO/DIS 19650-1](https://www.iso.org/standard/89703.html)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html)
- [ISO/DIS 19650-2](https://www.iso.org/standard/89704.html)
- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html)
- [ISO/DIS 19650-3](https://www.iso.org/standard/90358.html)
- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [ISO 19650-6:2025, outside this study](https://www.iso.org/standard/82705.html)
- [IMI Framework, formerly the UK BIM Framework](https://wearenima.im/uk-bim-framework/)
`,
  },
  {
    id: "personas",
    group: "base",
    groupLabel: "Base",
    nav: "Who does what",
    markdown: `## The people, before the documents

The system names functions, not job titles in a company. The same organization can hold more than one.

The appointing party is the party that commissions and receives the information. On a project that is often the client, but the word is not exhausted by client, owner, or employer. The lead appointed party coordinates information inside its team and between that team and the party that commissioned the work. An appointed party produces information about works, goods, or services. A delivery team is the lead appointed party plus its task teams. A task team produces a defined package of information.

A hospital can have a design team and a construction team at the same time. Each has its own lead appointed party and its own delivery team. The structural fabricator is an appointed party of the contractor. Its drafters are a task team.

An appointment is the agreement under which information is managed or produced. In the United Kingdom it is usually a contract. The appointing party writes the project's information protocol, includes it in every appointment, and requires it to flow down into sub-appointments. The protocol fixes rights and obligations. It is not an explanatory note. The British templates are written for English law and are not legal advice.

The information management function may be carried out by the appointing party itself, delegated to a lead appointed party, or commissioned from a third party. Guidance A of February 2021 separates that function from the resources that have to be produced. A resource does not have to be a standalone document: it can live in a system, or travel with other content. What matters is that the content exists, and that it is not promoted to contractual, or demoted from contractual, by mistake.

## Sources

- [Guidance 1, Concepts, 2nd edition, July 2019](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
- [Guidance A, the function and resources, edition 2, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [Information protocol guidance, edition 3, November 2021](https://www.ukbimframework.org/wp-content/uploads/2022/08/Information_protocols_supporting_the_delivery_phase_BS_EN_ISO_19650-2_and_the_operational_phase_BS_EN_ISO_19650-3_of_assets-Guidance_Edition-3.pdf)
- [Protocol template for delivery](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-2.pdf)
- [Protocol template for operation](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-3.pdf)
`,
  },
  {
    id: "requisitos",
    group: "base",
    groupLabel: "Base",
    nav: "What is required",
    markdown: `## From the organization's need to the appointment

The appointing party has to know what information it needs for its objectives. Guidance D, citing clause 5 of ISO 19650-1, orders the requirements as follows. It is not a single chain.

Organizational information requirements, OIR, are the starting point. They sit in clause 5.2 of Part 1 and in clause 5.1.2 of Part 3. They state the high-level information the organization needs across its portfolio and its functions. They are written as a business activity, not as a project activity.

From the OIR, two different things come out in parallel.

Asset information requirements, AIR, sit in clause 5.3 of Part 1 and in clause 5.1.4 of Part 3. They bring that need down to a particular asset: energy, maintenance, compliance, users. The appointing party prepares them, with the asset team if there is one, and they have to exist before the related appointment. They are not a construction deliverable. They are the origin of the exchange requirements used in operation.

Project information requirements, PIR, sit in clause 5.4 of Part 1 and in clause 5.1.2 of Part 2. There is one set per project. They serve the key decisions of that project: whether it continues, whether it fits the budget, whether it can open on the planned date. They are anchored to the plan of work. Clause 5.1.3 asks for information delivery milestones, defined against those decisions, for example a number of weeks beforehand.

Exchange information requirements, EIR, belong to an appointment, not to the whole project. Clause 5.5 of Part 1 introduces them. On a project they are set by clause 5.2.1. In operation, by clause 5.2.2. They say what information is delivered at each exchange, at what level of information need, and for which decision. The lead appointed party may add its own when appointing others, clause 5.4.3, without asking more of a party that is not the best placed to produce it.

One example closes the chain. A university's OIR includes reporting annual energy use. The AIR for a teaching building asks for that use measured by floor. The PIR for a refurbishment asks, at the end of concept design, for the information needed to decide whether the cost fits. The mechanical engineer's EIR names the containers, the level of information need, and the dates that make those three things possible.

Guidance D also separates the purpose of the information from the detail: content, form, and format. One requirement may name only the summary, for example a fire strategy, and leave the rest to the team. Another may also fix the breakdown, the drawing, and the PDF. What stays constant is that each requirement can be traced to a purpose. Asking without a purpose is waste.

The project information model, PIM, is the set of containers for delivery. The asset information model, AIM, is the set used while the asset is in service. They are not a single 3D model. They exist at asset level, project level, and delivery-team level.

## Sources

- [Guidance D, information requirements, edition 2, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
- [Guidance 1, sections 5.2 and 6](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
- [Resource table in Guidance A](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
`,
  },
  {
    id: "cde",
    group: "base",
    groupLabel: "Base",
    nav: "Container and CDE",
    markdown: `## The unit of information and its states

An information container, clause 3.3.12 of ISO 19650-1 as cited by the concepts guidance, is a named unit with a unique identifier: a model, a drawing, a cost plan, a specification. The information model is the set of those containers. To federate is to bring them together for a purpose, for example coordination, without each one ceasing to have its own author.

They are broken down so that several appointed parties can work at the same time without overwriting one another. The federation strategy, clause 10.4, explains why the model is broken down. The information container breakdown structure is the detail of those units. The appointing party may set the first, if it has a project rule, and it is communicated in the production methods. The lead appointed party agrees the second with its team. Both apply to every kind of container, not only to geometry.

The common data environment is not a software brand. It is the state workflow, plus the solution that supports it. Figure 10 of ISO 19650-1, explained in clause 12 and in Guidance C of September 2020, joins four ideas.

Work in progress is what its author or task team is still preparing. Others do not see it.

Shared is what has already been approved for sharing with other task teams, other delivery teams, or the appointing party. It is for comment and coordination. It can return to work in progress.

Published is what has been authorized for a use that already binds: developing the design, constructing, or managing the asset. In the British reading, the lead appointed party authorizes it and the appointing party accepts it. The revision code with a C prefix, from the national annex, marks that state against the preliminary P. That code is United Kingdom practice, not a universal ISO rule.

Archive is the journal of the container. It is not the waste bin. Each transition is recorded.

The figure is a scheme. A container can take another path and can live in more than one solution. Clause 12.1 recommends three metadata items: revision code, status code, and classification code. Clause 5.1.7 of Part 2 requires the CDE to allow them to be assigned. The unique identifier is also metadata, but Guidance C warns that status and revision should not be hidden inside the name.

Do not confuse shared resources with the Shared state. In clause 5.1.6, shared resources are templates, object libraries, or styles that the appointing party makes available. The Shared state is a moment in the workflow.

## Sources

- [Guidance C, the CDE, edition 1, September 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [Guidance 1, section 6, container and federation](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf)
`,
  },
  {
    id: "loin",
    group: "base",
    groupLabel: "Base",
    nav: "How much information",
    markdown: `## Level of information need

The level of information need answers one question: how much information is enough, in this exchange, for this purpose. It exists so that too little is not delivered, which raises risk, and too much is not delivered, which is waste. The 2019 concepts guidance says the term is not abbreviated. LOD and level of detail are older frameworks used in some countries. They may illustrate a local method. They are not the ISO term.

The concept enters in clause 11.2 of ISO 19650-1. The appointing party sets the method in the project's information standard and applies it in each EIR. The level of each container is recorded in the task information delivery plan.

Guidance D, still on clause 11.2, asks for three subdivisions: geometrical information, alphanumerical information, and documentation. A fire door in technical design may need the opening and the swing, the fire rating and the identifier, and the test certificate. Asking at that moment for fabrication geometry is usually more than the decision requires.

ISO 7817-1:2024 is now the international text of concepts and principles for stating that level with a stable method. The public abstract applies it across the life cycle, to a general exchange, to work in progress, and to an appointment with a specified delivery. It has 23 pages and was published on 20 June 2024, stage 60.60. The NEN catalogue withdraws NEN-EN 17412-1:2020 on 1 July 2024 and replaces it with NEN-EN-ISO 7817-1:2024. The ISO 7817-1 record does not itself use the word supersedes. The draft of Part 2 does pair the two numbers: EN 17412-1, ISO 7817-1.

That Part 2, ISO/DTS 7817-2, was still a draft on 26 November 2026, stage 50.20 since 17 September 2026. Its abstract says it will show how to write geometry, data, and documentation, and that it will relate them to the EIR, the BIM execution plan, the information delivery manual of ISO 29481, and IFC. It is not a published standard. Part 3, ISO/DIS 7817-3, a UML model and an XML schema, closed its vote on 6 May 2026 and the record was still at 40.60, with no published decision.

Until those parts are published, study 7817-1 together with clause 11.2 and the three subdivisions in Guidance D.

## Sources

- [ISO 7817-1:2024](https://www.iso.org/standard/82914.html)
- [NEN-EN 17412-1:2020, withdrawn](https://www.nen.nl/en/nen-en-17412-1-2020-en-277555)
- [ISO/DTS 7817-2, draft](https://www.iso.org/standard/89075.html)
- [ISO/DIS 7817-3, draft](https://www.iso.org/standard/89077.html)
- [Guidance D, the level of information need section](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
`,
  },
  {
    id: "entrega",
    group: "proceso",
    groupLabel: "Process",
    nav: "Delivery",
    markdown: `## While the asset is designed and built

ISO 19650-2:2018 specifies the information process in the delivery phase. It applies to any asset and any size, whatever the procurement route. Guidance 2, edition 6, February 2021, reads clause 5 as eight activities. Activities 5.1 and 5.8 belong to the whole project. Activities 5.2 to 5.7 repeat for each appointment.

| Clause | Activity | Who acts first |
| --- | --- | --- |
| 5.1 | Assessment and need | Appointing party |
| 5.2 | Invitation to tender | Appointing party |
| 5.3 | Tender response | Prospective lead appointed party |
| 5.4 | Appointment | Lead appointed party, with the appointing party |
| 5.5 | Mobilization | Lead appointed party and its delivery team |
| 5.6 | Collaborative production of information | Task teams and lead appointed party |
| 5.7 | Information model delivery | Lead appointed party, then the appointing party accepts |
| 5.8 | Project close-out | Appointing party |

The spelling mobilization is the one used in that edition of the guidance. British English also writes mobilise. It is the same activity.

Before tender, the appointing party has ready, according to the table in Guidance A, the milestones (5.1.3), the information standard (5.1.4), the information production methods and procedures (5.1.5), the reference information and the shared resources (5.1.6), the information protocol (5.1.8), the EIR (5.2.1), and the criteria for evaluating the tender (5.2.3).

The BIM execution plan is cited at clause 3.1.3.1. There is one plan with two moments, not two rival documents. At tender, clause 5.3.2, the prospective party establishes it. The clause names seven considerations. The passage read in the guidance does not list them, so they are not invented here. After the contract, clause 5.4.1 confirms that plan. At tender the party may also propose changes to the information standard or to the methods, including those needed to share information securely.

There are two matrices and they are not mixed. The information management activity matrix has an indicative template in Annex A of Part 2, tied to clause 5.1.1. The deliverables matrix has no template in the series. It starts, at a high level, inside the tender plan, and it is refined after the contract. That detailed matrix feeds the TIDPs and the MIDP. The clauses the guidance cites are 5.3.2, 5.4.1, 5.4.2, 5.4.4, and 5.4.5.

Each task team prepares a task information delivery plan, clause 5.4.4. For each container it records name and title, predecessors or dependencies, level of information need, estimated production time, author, and delivery milestones. The lead appointed party compiles those plans into a master information delivery plan, clause 5.4.5. The standard does not impose a single format.

Clause 5.3.6 requires the prospective party to establish the delivery team's risk register. It is about the risk of delivering the information on time and in the required condition, not the general site health and safety register. Clause 6.3.1 of Part 1, cited by the concepts guidance, places information risk inside ordinary risk management. One example: the specialist is not yet known, so the federation strategy in the tender is provisional and is confirmed at mobilization, before the first shared exchange.

Mobilization, clauses 5.5.1, 5.5.2, and 5.5.3 in the guidance, starts people and technology and tests the methods before serious production. In production, clauses 5.6.3 to 5.6.5 and 5.7.1 to 5.7.4 describe layers of review: the task team, the lead appointed party, and, when the model is delivered, acceptance by the appointing party, clause 5.7.4. Close-out, 5.8, includes lessons learned.

## Sources

- [Guidance 2, edition 6, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-2_Parties-teams-and-processes-for-the-delivery-phase-of-assets_Edition-6.pdf)
- [Guidance F, information delivery planning, September 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-F_About-information-delivery-planning_Edition-1.pdf)
- [Guidance E, tendering and appointments, edition 2, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
- [Guidance A, resource table](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html)
`,
  },
  {
    id: "operacion",
    group: "proceso",
    groupLabel: "Process",
    nav: "Operation",
    markdown: `## When the asset is already in use

ISO 19650-3:2020 specifies the process during the operational phase, the time in which the asset is used for the purpose it was made. Parties may meet it directly or delegate it. The project leader's text, David Churcher, 26 August 2020, addresses those who own or operate the asset and the teams that maintain, repair, or monitor it. It also serves delivery teams, because the information they hand over at the end is the start of operation.

In this phase the appointing party is the owner, the operator, or whoever acts for them. The lead appointed party may be a contractor or an in-house team. The process is the same. A framework agreement with call-off orders is still an appointment.

Guidance 3, edition 2, February 2021, reads the process as eight steps, clauses 5.1 to 5.8. Step 1 is prepared by the appointing party: OIR, AIR, foreseeable events, the asset information standard, and the CDE. The diagram then opens into three paths.

Path B is a foreseeable trigger event, for example a maintenance visit or an inspection. It is procured and mobilized before it happens. Clauses 5.2 and 5.3 are procurement. Clauses 5.4 and 5.5 are planning and mobilization. When the event arrives, information is produced and reviewed, clauses 5.6 and 5.7.

Path C is an event that could not reasonably be planned: damage, a demand spike, a new project. It happens first. Procurement, mobilization, and production come after. There will be an unavoidable delay between the event and the work.

Path D is acquiring an asset that belonged to someone else. The relationship is not that of a client and a works contractor. The buyer often cannot demand the information as a condition of the price. Sometimes it is negotiated, or a check is commissioned separately.

Clause 5.1.5 is the one the guidance cites for identifying foreseeable trigger events. Those events set the pace of operation, just as the plan of work sets the pace of a project. One example from the guidance: after a boiler service, update the log book; in an empty school, the legionella tests.

The handover between models is not a single instant. The guidance's reading of the life-cycle figure marks three things. At the start of delivery, the relevant information passes from the AIM to the PIM. At the start of operation, the relevant information passes from the PIM to the AIM. During delivery there can also be handovers, not only at the two ends. The appointing party reviews and accepts what each lead appointed party delivers and then updates the systems where the AIM lives. Acceptance does not prove that, later, the information is still complete. The appointment protocol explains that responsibility.

Some tasks, including the BIM execution plan, are deliberately lighter than in Part 2. Proportionality requires the effort to match the asset, the event, and the value of the information. It does not authorize omitting a legal need. The guidance gives examples: apply the process only to critical assets, or leave reference information out of a competition when none of it is useful.

## Sources

- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html)
- [David Churcher's note, 26 August 2020](https://committee.iso.org/sites/tc59/home/news/content-left-area/news-and-updates/new-standard-for-more-efficient.html)
- [Guidance 3, edition 2, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-3_Operational-phase-of-the-asset-life-cycle_Edition-2.pdf)
- [Guidance D, OIR and AIR](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
`,
  },
  {
    id: "intercambio",
    group: "proceso",
    groupLabel: "Process",
    nav: "Exchange",
    markdown: `## Deciding whether the file is shared or published

ISO 19650-4:2022, 12 pages, published on 11 August 2022, specifies the process and the decision criteria of an information exchange, so that the resulting PIM or AIM is fit for purpose. It applies to the delivery stages of Part 2 and to the trigger events of Part 3. It is used at the scale of the asset.

The public abstract explains shall consider. The person has to think through each item on the list. The time and the evidence depend on the asset, on experience, and on national policy. On a small asset, some items are set aside at once, provided the setting aside is a decision and not an omission.

Parts 1, 2, 3, and 5 speak of appointing, lead appointed, and appointed parties. For one exchange, Part 4 also uses information provider, information receiver, and information reviewer, because the same organization changes role with the moment. The criteria at the two decision points are the same: the applicable EIR, with the information standard and the methods, plus the quality criteria of clause 7. Technical quality is also reviewed.

Guidance 4, March 2023, places two points, A and B, on the CDE workflow. The text says that both use the same criteria. A reading of that text, not a copy of the figure, associates A with sharing during development and B with publishing after authorization and acceptance. The guidance itself recommends sharing early and often, and publishing once, when the container is already authorized and accepted. If the figure used other labels, this reading would have to be corrected against a copy of the standard.

Guidance C, which Guidance 4 points to for operating the CDE, defines published as authorized by the lead appointed party and accepted by the appointing party. Shared is use outside the authoring task team, before that acceptance.

Clauses 7.1 to 7.6 are six criteria, mostly independent of a client's functional requirements, and that is why they can be standardized. Clause 7.7 says the standard does not prescribe the functional, technical, or similar criteria. Those stay in the EIR.

| Clause | What it looks at | Example from the guidance |
| --- | --- | --- |
| 7.1 CDE | Name and metadata | A name that does not meet the annex that was agreed |
| 7.2 Conformance | Schema and format | An XML file that is not well formed |
| 7.3 Continuity | Correspondence with other exchanges | A space that changes name between versions without control |
| 7.4 Communication | Loss in translation or conversion | A date that is read wrongly |
| 7.5 Consistency | Federation, space, and attributes | The same element in two models, a gap between elements, or a weight that does not match the product data sheet |
| 7.6 Completeness | Presence and sufficiency | Material and volume are missing |

They apply to drawings, documents, and sketches, and also to models and databases. Open, structured information makes automatic checks easier. The authoring program can prevent the defect before export. The review program can find it afterwards. Both are quality.

Information sustainability, in Guidance 4, is information that continues to exist outside the program that created it and the program that consumes it. The same data can later serve cost, carbon, safety, or supply. The informative annexes, which are not copied here, list open standards that are candidates for structure, format, and classification. Whether a particular exchange travels in IFC is decided by the EIR. Part 4 encourages not locking the data into a format that dies with the licence.

The British national annex to this part, according to the guidance, adds Uniclass to the container and to entities such as zones and products. That is a national addition.

## Sources

- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [Guidance 4, March 2023](https://nottingham-repository.worktribe.com/preview/21112102/ISO_19650_Guidance_4_Information%20exchange_Edition%201.pdf)
- [Guidance C, CDE states](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [IMI Framework resources](https://imiframework.org/resources/)
`,
  },
  {
    id: "seguridad",
    group: "proceso",
    groupLabel: "Process",
    nav: "Security",
    markdown: `## Sensitive information, without closing collaboration

ISO 19650-5:2020, confirmed on 24 October 2025, specifies a security-minded approach to information at the maturity of Part 1, and to sensitive information in any initiative, project, asset, product, or service. It covers the whole cycle, whether the asset already exists or is only planned. It includes building a proportionate culture and auditing compliance. It also matters for commercial information, personal information, and intellectual property. It is not a data-protection manual.

The National Protective Security Authority, NPSA, is where the IMI Framework sends the reader. There is no Guidance 5 of the UK BIM Framework. NPSA says the ISO standard replaces PAS 1192-5 and takes up ideas from PAS 185 and PAS 1085. Those PAS documents are predecessors. The concepts guidance of July 2019 still told readers to use PAS 1192-5 until Part 5 appeared. That sentence went out of date in June 2020.

The aim is not to cancel BIM collaboration. It is to understand the vulnerabilities and to leave the risk at a level the parties tolerate. The same care applies to a trade secret and to the internal drawing of a pumping station that should not appear in the open coordination model.

The NPSA introduction orders the process as follows. Establish whether the approach is needed, using the sensitivity assessment process where it applies. Initiate it: governance, responsibilities, and the start of the approach. Write a security strategy: risks, mitigations, and risks that are tolerated. Write a security management plan, which includes policies, security information requirements, rules for giving information to third parties, logistical requirements, and a security breach/incident management plan. Work with the appointed parties, inside and outside contract. Monitor, audit, and review.

Another NPSA note is titled application of the security triage process. The recovered fragment says that a copy of the assessment is kept and that, if the approach is adopted, clauses 5 to 9 are applied. It was not confirmed whether sensitivity assessment and security triage are the same clause. An NHS Scotland navigator names outcomes ST1, ST2, ST3, and ST4 against clause 4.8, but that PDF gets the years of Parts 1 and 2 wrong. Those codes stay unconfirmed. They are not studied as a definition.

Part 5 does not, according to the protocol guidance, use the expression information protocol. It does require the appointment documents to provide for clause 9.2. Guidance E says that the standards identified while making the security management plan are considered in the information standard, and it cites clauses 7 and 9.2. One example from the guidance, not a universal rule: a sensitivity metadata item and the CDE through which it is distributed.

## Sources

- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [NPSA, security-minded approach, updated 21 September 2026](https://www.npsa.gov.uk/security-best-practices/build-it-secure/security-minded-approach-digital-engineering)
- [NPSA introduction to BS EN ISO 19650-5](https://www.npsa.gov.uk/system/files/documents/NPSA%20-%20Introduction%20to%20BS%20EN%20ISO%2019650-5.pdf)
- [NPSA, application of the security triage process](https://www.npsa.gov.uk/system/files/documents/NPSA%20Application%20of%20the%20Security%20Triage%20Process.pdf)
- [IMI Framework resources page](https://imiframework.org/resources/)
- [Guidance E, clauses 7 and 9.2](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
`,
  },
  {
    id: "formatos",
    group: "formatos",
    groupLabel: "Formats",
    nav: "IFC, IDS and bSDD",
    markdown: `## How to check what the process asked for

ISO 19650 says who needs the information, when, and at what level. It does not by itself define the file schema. Three open pieces make part of that level checkable.

ISO 16739-1:2024 is edition 2 of the Industry Foundation Classes schema. It withdraws the 2018 edition. It was published on 22 March 2024, 496 pages, stage 60.60. The abstract adds infrastructure: bridges, roads, railways, waterways, and ports. It publishes the schema, the documentation, the property and quantity sets, and the structure of the exchange file. A model view definition is a subset for a particular delivery. The program declares which view it conforms to. buildingSMART identifies IFC 4.3 ADD2, version 4.3.2.0, of April 2024, as the official edition that corresponds to that ISO. The HTML documentation says it has the same schema, plus examples, under CC BY-ND 4.0.

ISO 7817-1 says how to express the level. IFC is one way to carry the model. The EIR decides whether that way is the one that was ordered.

Information Delivery Specification 1.0 is a buildingSMART standard, not an ISO standard. Tag v1.0.0 was published on 3 June 2024, after a favourable vote of the standards committee. The release note said there was talk of taking it to CEN or to ISO. The schema file in the tag carries version 1.0.0. The copy on this site is Development/ids.xsd from that tag. It was not compared byte for byte with https://standards.buildingsmart.org/IDS/1.0/ids.xsd. The repository licence is CC BY-ND 4.0: it may be kept unmodified, with credit to buildingSMART International Ltd.

An IDS file is a list of specifications. The manual gives this example: all walls must have a fire rating property. Each specification has a description for the person, an applicability that selects objects, and requirements that say what those objects must have. Both parts are built from facets. In 1.0 there are six: entity, with IFC class and predefined type; attribute, with name and value; classification, with system and value; property, with property set, name, and value; material, with value; and parts, whose element in the schema is called partOf. There is no geometry facet. A property value may be omitted if it is enough that the property exists. Complex restrictions limit a value to a list, a range, or a pattern.

The Aachen file that travels in the same tag still points at schema 0.9.7. It is not a 1.0 example.

bSDD is a free buildingSMART service for publishing and citing definitions of classes and properties. The service page says it is not a standard. It applies ideas from ISO 12006-3, ISO 23386, and ISO 23387. Organizations publish the content. When a version becomes Active, its URI does not change. What is loaded from IFC, according to that page, is the dictionary of tangible objects and properties of IFC 4.3, not the complete schema. IDS can point at a bSDD class or property by its URI, without copying the definition. The distinction the service itself draws: bSDD can define what a kitchen is and what a net area is. An IDS can require that this model have at least one such kitchen, with an area above a value.

A passed IDS is not acceptance of the container. Acceptance remains the Part 4 decision.

Guidance B of September 2020 places open data, buildingSMART, and COBie in the British framework. It predates IFC 4.3 and IDS 1.0. It is context, not a current technical record. The CIBSE DE3 templates, from 2016, were written for PAS 1192-2:2013. They are history.

## Sources

- [ISO 16739-1:2024](https://www.iso.org/standard/84123.html)
- [IFC edition table](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/)
- [Introduction to IFC](https://technical.buildingsmart.org/standards/ifc/)
- [IFC 4.3.2.0 documentation](https://standards.buildingsmart.org/IFC/DEV/IFC4_3/HTML/)
- [IDS 1.0.0](https://github.com/buildingSMART/IDS/releases/tag/v1.0.0)
- [IDS 1.0 schema](https://standards.buildingsmart.org/IDS/1.0/ids.xsd)
- [CC BY-ND 4.0 licence](https://creativecommons.org/licenses/by-nd/4.0/)
- [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/)
- [Citing bSDD from IDS and IFC](https://technical.buildingsmart.org/services/bsdd/referencing-bsdd-in-ids-and-ifc/)
- [Guidance B, September 2020, context only](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-B_Open-data-buildingSMART-and-COBie_Edition-1.pdf)
`,
  },
  {
    id: "fuentes",
    group: "cierre",
    groupLabel: "Close",
    nav: "Every source",
    markdown: `## Where each thing lives

The full ISO and CEN standards are paid. What follows are the open records and the guidance that could be read on 26 November 2026. The Online Browsing Platform preview did not load, so no definition was copied from there. Clause numbers are those cited by the guidance, not a transcription of the paid text.

### Standards, catalogue records

- [ISO 19650-1:2018](https://www.iso.org/standard/68078.html) and its draft [ISO/DIS 19650-1](https://www.iso.org/standard/89703.html)
- [ISO 19650-2:2018](https://www.iso.org/standard/68080.html) and its draft [ISO/DIS 19650-2](https://www.iso.org/standard/89704.html)
- [ISO 19650-3:2020](https://www.iso.org/standard/75109.html) and its draft [ISO/DIS 19650-3](https://www.iso.org/standard/90358.html)
- [ISO 19650-4:2022](https://www.iso.org/standard/78246.html)
- [ISO 19650-5:2020](https://www.iso.org/standard/74206.html)
- [ISO 19650-6:2025](https://www.iso.org/standard/82705.html), health and safety, not studied here
- [ISO 7817-1:2024](https://www.iso.org/standard/82914.html), [draft of Part 2](https://www.iso.org/standard/89075.html), and [draft of Part 3](https://www.iso.org/standard/89077.html)
- [Withdrawal of EN 17412-1:2020 at NEN](https://www.nen.nl/en/nen-en-17412-1-2020-en-277555)
- [ISO 16739-1:2024](https://www.iso.org/standard/84123.html)
- [Churcher's note on Part 3](https://committee.iso.org/sites/tc59/home/news/content-left-area/news-and-updates/new-standard-for-more-efficient.html)

### Open United Kingdom guidance

- [What the framework is today](https://wearenima.im/uk-bim-framework/) and [its resources](https://imiframework.org/resources/)
- [Concepts, July 2019](https://imiframework.org/wp-content/uploads/2019/10/Information-Management-according-to-BS-EN-ISO-19650_-Guidance-Part-1_Concepts_2ndEdition.pdf). Its security section is superseded.
- [Guidance A, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-A_The-information-management-function-and-resources_Edition-2.pdf)
- [Guidance B, September 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-B_Open-data-buildingSMART-and-COBie_Edition-1.pdf)
- [Guidance C, September 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-C_Facilitating-the-common-data-environment-workflow-and-technical-solutions_Edition-1.pdf)
- [Guidance D, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-D_Developing-information-requirements_Edition-2.pdf)
- [Guidance E, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-E_Tendering-and-appointments_Edition-2.pdf)
- [Guidance F, September 2020](https://www.ukbimframework.org/wp-content/uploads/2020/09/Guidance-Part-F_About-information-delivery-planning_Edition-1.pdf)
- [Guidance 2, edition 6, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-2_Parties-teams-and-processes-for-the-delivery-phase-of-assets_Edition-6.pdf)
- [Guidance 3, edition 2, February 2021](https://www.ukbimframework.org/wp-content/uploads/2021/02/Guidance-Part-3_Operational-phase-of-the-asset-life-cycle_Edition-2.pdf)
- [Guidance 4, March 2023](https://nottingham-repository.worktribe.com/preview/21112102/ISO_19650_Guidance_4_Information%20exchange_Edition%201.pdf)
- [Protocol guidance](https://www.ukbimframework.org/wp-content/uploads/2022/08/Information_protocols_supporting_the_delivery_phase_BS_EN_ISO_19650-2_and_the_operational_phase_BS_EN_ISO_19650-3_of_assets-Guidance_Edition-3.pdf), [delivery template](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-2.pdf), and [operation template](https://www.ukbimframework.org/wp-content/uploads/2021/11/Information-Protocol-Template-to-support-BS-EN-ISO-19650-3.pdf)

### Security and openBIM

- [NPSA page](https://www.npsa.gov.uk/security-best-practices/build-it-secure/security-minded-approach-digital-engineering), [introduction](https://www.npsa.gov.uk/system/files/documents/NPSA%20-%20Introduction%20to%20BS%20EN%20ISO%2019650-5.pdf), and [triage](https://www.npsa.gov.uk/system/files/documents/NPSA%20Application%20of%20the%20Security%20Triage%20Process.pdf)
- [IFC edition table](https://technical.buildingsmart.org/standards/ifc/ifc-schema-specifications/), [introduction](https://technical.buildingsmart.org/standards/ifc/), and [4.3.2 documentation](https://standards.buildingsmart.org/IFC/DEV/IFC4_3/HTML/)
- [IDS 1.0.0](https://github.com/buildingSMART/IDS/releases/tag/v1.0.0) and [schema](https://standards.buildingsmart.org/IDS/1.0/ids.xsd)
- [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/) and [how to cite it](https://technical.buildingsmart.org/services/bsdd/referencing-bsdd-in-ids-and-ifc/)

What is not used as a definition: the paid text of the standards, PAS 1192 and BS 1192 as a current rule, the 2016 CIBSE templates, and the packs that ask for an email address before download.
`,
  },
  {
    id: "preguntas",
    group: "cierre",
    groupLabel: "Close",
    nav: "Check",
    markdown: `## Read the question, answer it, and only then look

1. Which edition of each text from 19650-1 to 19650-5 do you study today, and which of them is confirmed with no replacement draft?
2. Why is the abstract of ISO/DIS 19650-2 not enough to say how operation will turn out?
3. Can the same organization be a lead appointed party and, at the same time, contain a task team?
4. Where do the AIR and the PIR come from, and how many PIR sets does a project have?
5. Which clauses does Guidance D cite for the appointing party's EIR, on a project and in operation?
6. Who sees a container while it is in work in progress, and which two acts are required before the British reading calls it published?
7. Why is level of information need not written as LOD?
8. What replaced EN 17412-1:2020, and on what date does NEN record that?
9. Which clauses of Part 2 repeat for each appointment?
10. At what moment is the BIM execution plan established, and at what moment is it confirmed?
11. What is Annex A for, and which matrix has no template?
12. Which six items does a TIDP record for each container, according to Guidance F?
13. Which Part 3 path is procured before the trigger event, and which path cannot be?
14. Does the move from PIM to AIM happen only when operation starts?
15. What does each of clauses 7.1 to 7.6 look at, and what does 7.7 refuse to prescribe?
16. Which PAS does NPSA say was replaced, and why are ST1 to ST4 not memorized?
17. Which IFC edition did ISO 16739-1:2024 withdraw, and which six facets does IDS 1.0 have?
18. Does a passed IDS mean the appointing party has already accepted the container?

## Answers

1. 2018, 2018, 2020, 2022, and 2020. Only Part 5 is confirmed, stage 90.93, with no replacement draft on the record. Part 4 is published, stage 60.60, also with no draft.
2. Because that abstract still describes delivery, while the record says the draft will also replace Part 3. The clause text was not read.
3. Yes. The lead appointed party can be the same organization as one of its task teams.
4. From the OIR. One PIR set per project.
5. ISO 19650-2, clause 5.2.1, and ISO 19650-3, clause 5.2.2.
6. Only the author or its task team. In the British guidance, the lead appointed party authorizes it and the appointing party accepts it.
7. Because the 2019 guidance says the term is not abbreviated. LOD is an earlier framework.
8. NEN-EN-ISO 7817-1:2024, with the European standard withdrawn on 1 July 2024.
9. 5.2 to 5.7. Clauses 5.1 and 5.8 belong to the project.
10. The prospective party establishes it at tender, clause 5.3.2. It is confirmed after the contract, clause 5.4.1.
11. It is an indicative template of management activities. The deliverables matrix has no template in the series.
12. Name and title, predecessors or dependencies, level of information need, estimated time, author, and milestones.
13. Path B is procured before. Path C starts because the event has already happened. Path D is an acquisition, not a works contract.
14. No. There can also be handovers during delivery, and at the start of delivery there is a handover from the AIM to the PIM.
15. Name and metadata, schema and format, continuity, loss in conversion, consistency, and presence. Clause 7.7 leaves functional and technical criteria out.
16. PAS 1192-5. The codes come from a navigator that also misdates Parts 1 and 2, and they were not confirmed in the NPSA note used here.
17. It withdrew ISO 16739-1:2018. The facets are entity, attribute, classification, property, material, and partOf. There is no geometry.
18. No. Acceptance remains the Part 4 decision.

If an answer does not come out in your own words, go back to that topic in the contents. There is no need to reread from the map.
`,
  },
];

export function loadCurriculum(): CurriculumScreen[] {
  return screens.map((screen) => ({
    id: screen.id,
    group: screen.group,
    groupLabel: screen.groupLabel,
    nav: screen.nav,
    html: renderStudyMarkdown(screen.markdown, () => null),
  }));
}
