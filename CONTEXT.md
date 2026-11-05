# BubbleBoard

A free, open-source app that replaces a kindergarten's corkboard, between its staff and its families. These are the words for who uses it, who runs it, and where one kindergarten ends.

## Language

### Kindergartens and installations

**Kindergarten**:
The organization that uses BubbleBoard: its classrooms, staff, children, and families, kept in one catalog.
_Avoid_: tenant, organization, school

**Installation**:
One running copy of BubbleBoard, at its own address, that serves exactly one **Kindergarten**.
_Avoid_: instance, deployment, tenant

**Operator**:
Whoever runs an **Installation** from outside the app: deploys it, keeps it within its limits, and restores it. An operator holds no card and no role in the app, and sees only encrypted records.
_Avoid_: admin, owner

**Hosted installation**:
An **Installation** whose **Operator** is Commit, for a kindergarten with nobody to run one.
_Avoid_: SaaS, managed instance, tenant

**Self-hosted installation**:
An **Installation** whose **Operator** is the kindergarten itself or someone it asks, such as a volunteer parent.
_Avoid_: private instance, on-premise

**Site**:
Commit's official website about BubbleBoard and its sister apps, at bubbleboard.fyi. It is not an **Installation**: it holds no kindergarten, no copy of the code serves it, and it sends nobody into an installation's app, since families of every installation reach it.
_Avoid_: landing page (for the whole site), homepage

**Sister app**:
An app in BubbleBoard's family, made together with kindergarten teachers and joining it only once they approve it: Commit's own, such as BubbleCam, or someone else's. Each has a page of its own on the **Site**, in its own look.
_Avoid_: plugin, module, ecosystem app

**Head**:
The staff role that runs a whole **Kindergarten** in the app, which the interface calls "BubbleBoard administrator". A head's reach ends at her own kindergarten, and she has no say over its **Installation**.
_Avoid_: admin, director

## Relationships

- An **Installation** serves exactly one **Kindergarten**, and a **Kindergarten** uses one **Installation**.
- An **Operator** runs one or more **Installations**; Commit can be the operator of many.
- A **Hosted installation** and a **Self-hosted installation** are the same code, deployed the same way; only the **Operator** differs.
- A family or teacher in two **Kindergartens** uses two **Installations**, so two installed apps. Installations are never linked.
- An **Installation** serves its app and its own privacy policy. The policy names its **Kindergarten**, which answers to families for their data whoever the **Operator** is, and an **Operator** other than the kindergarten, which processes those data on its behalf. Everything about BubbleBoard itself is on the **Site**.
- A **Kindergarten** has one or more **Heads**. Being an installation's **Operator** makes no one a **Head**, and being a **Head** makes no one its **Operator**, though one person can be both.

## Example dialogue

> **Dev:** Sunce has nobody technical. Can we just add their classrooms to our installation?
>
> **Domain expert:** No. Classrooms belong to one kindergarten, and every staff card there opens the same Staff Key. Sunce gets an installation of its own.
>
> **Dev:** Who's its admin, then? Us?
>
> **Domain expert:** Its first head, whom Sunce chooses. Commit is only the operator: it deploys the installation and watches its limits, and it can't read anything in it.
>
> **Dev:** Can our heads at least help them add teachers?
>
> **Domain expert:** Not as heads. A head's reach ends at her own kindergarten.
>
> **Dev:** And a mum with one child at Sunce and one with us?
>
> **Domain expert:** Two installations, so two apps on her phone. Both are called BubbleBoard unless a kindergarten gives its app a name of its own. Sunce's is a hosted installation and ours could be self-hosted tomorrow; nothing in either app would change.

## Flagged ambiguities

- "Admin" meant both the **Head** of a kindergarten and the **Operator** of an installation. They are different people with different powers: a head works inside the app, an operator outside it.
- "Instance" ("instanca") meant **Installation**.
- "Semi-SaaS" ("polu-SaaS") meant **Hosted installations**: Commit operates them, nobody signs up, and each kindergarten still has an installation of its own.
- "Landing page" meant the pages about BubbleBoard that every installation served. They are now the **Site**'s, and an installation serves none of them.
