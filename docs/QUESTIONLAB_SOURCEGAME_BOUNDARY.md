# QuestionLab vs Sourcegame — Boundary & Guardrails

Dit document is bindend voor alle wijzigingen in dit project.

## 1) Scheiding van modules

- **QuestionLab** is een zelfstandige lesontwerp-app:
  - UI-route: `/lab/questions`
  - Doel: hoofdvragen/deelvragen maken en bronnen matchen.
- **Use the Source (Sourcegame)** is een zelfstandige game-module:
  - UI-routes: `/sourcegame/teacher`, `/join`, `/sourcegame/play/:id`, `/sourcegame/board/:id`
  - Doel: spelvorm met teams, termen, quiz en score.

## 2) Wat nadrukkelijk NIET mag

- Geen Sourcegame-flow, knoppen of schermen in QuestionLab UI.
- Geen QuestionLab-flow, schermlogica of wizard in Sourcegame UI.
- Geen route rewrites die beide modules functioneel laten samenvloeien.

## 3) Enige toegestane koppeling

Alleen via PostgreSQL-data hergebruik:

- bronmetadata en labels (entities, terms, jaar/personen/dimensies),
- game-learnings die na review zijn goedgekeurd,
- matching- en kwaliteitsdata voor retrieval/ranking.

Praktisch relevante tabellen:

- QuestionLab/matching:
  - `lessie.sources`
  - `lessie.source_entities`
  - `lessie.questions`
  - `lessie.question_profiles`
  - `lessie.question_context_a`
- Sourcegame:
  - `lessie.source_game_*`
  - `lessie.source_game_learned_labels`

## 4) Deploy en domeinen

- Bestaande app-hosting: `https://kleio9nov-578e4.web.app`
- QuestionLab productiepad: `/lab/questions`
- Sourcegame productiepaden: `/sourcegame/*` en `/join`
- Gewenste domeinrouting:
  - `https://usethesource.it` -> leerling join flow
  - `https://usethesource.it/teacher` -> docent flow

## 5) Definition of Done voor nieuwe changes

Elke change moet aantoonbaar voldoen aan:

1. QuestionLab blijft op `/lab/questions` volledig bruikbaar zonder game-afhankelijkheid.
2. Sourcegame blijft op `/sourcegame/*` en `/join` volledig bruikbaar zonder QuestionLab-flow in de UI.
3. Koppeling tussen beide modules loopt alleen via data-opslag/hergebruik in PostgreSQL.
4. In PR- of overdrachtstekst staat expliciet dat deze boundary is gerespecteerd.

