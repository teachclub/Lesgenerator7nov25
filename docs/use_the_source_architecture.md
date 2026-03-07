# Use the Source – Architecture

This document explains the architecture of the Use the Source game inside Lessie2000.

It is intended for AI assistants (Codex, ChatGPT, Gemini) and developers continuing the project.You are continuing development of the “Use the Source” source-analysis game inside the Lessie2000 project.

The user (Cees Koole) is building a Kahoot-style history game focused on analysing historical sources.

The game must be stable, visually predictable, and controlled via storyboard templates stored in Postgres.

This message gives the full architectural context so development can continue without re-inventing the system.

------------------------------------------------
PROJECT CONTEXT
------------------------------------------------

Project: Lessie2000
Repo path:
/Users/ceeskoole/Sites/lessie2000_clean

Main game:
Use the Source

Important routes:

/sourcegame/teacher
/sourcegame/join
/sourcegame/play/:id
/sourcegame/board/:id

Owner tools:

/owner/games
/owner/storyboard
/owner/testlab
/owner/analytics

Database: Postgres

Templates are stored in:

lessie.sourcegame_templates
lessie.sourcegame_template_versions
lessie.sourcegame_template_drafts

When a game session starts:

the published template is frozen in:

session.meta.template_id
session.meta.template_version_id
session.meta.template_content_json

Runtime must ALWAYS use this frozen version.

------------------------------------------------
CORE GAME IDEA
------------------------------------------------

Use the Source teaches students to analyse historical sources.

Gameplay modules:

1 terms
2 odd_one_out
3 question_maker
4 quiz

Each module focuses on different source-analysis skills.

Terms:
players recall relevant concepts.

Odd one out:
players identify which concept does NOT belong.

Question maker:
players generate historical questions.

Quiz:
multiple choice interpretation questions.

------------------------------------------------
DEFINITIVE GAMEFLOW
------------------------------------------------

There is only ONE reading phase in the whole game.

Gameflow must always be:

intro_mission
reading_source

terms_instruction
terms
scoreboard_terms

odd_one_out_instruction
odd_one_out
scoreboard_odd_one_out

question_maker_instruction
question_maker
scoreboard_question_maker

quiz_question
reveal
scoreboard_quiz

quiz_question
reveal
scoreboard_quiz

quiz_question
reveal
scoreboard_quiz

podium
mvp
finished

Important rules:

reading happens only once.

After reading:
every module follows

instruction → game → scoreboard

Quiz follows:

question → reveal → scoreboard.

------------------------------------------------
VISUAL STYLE
------------------------------------------------

The game has a Star Wars cockpit theme.

Two text styles exist:

autocue3d_space
text_processor

autocue3d_space:

text scrolls outside the spaceship window
behind cockpit frame
in starfield

Used for:

intro_mission
reading_source

text_processor:

close-up cockpit monitor panel
typewriter animation

Used for:

all game instructions.

------------------------------------------------
ODD ONE OUT (IMPORTANT)
------------------------------------------------

Old chip-rain mechanic must NOT be used anymore.

Odd one out replaces it.

Gameplay layout:

split screen

LEFT:
4 monster chips stacked vertically.

player must click the concept that does NOT belong.

RIGHT:
same 4 chips shown as reference cards.

click card to reveal definition.

Correct click → points
Wrong click → penalty.

------------------------------------------------
QUESTION MAKER
------------------------------------------------

Players can submit MULTIPLE questions.

Scoring example:

excellent question = 100
good question = 50
weak question = 10

Bonuses:

speed bonus
extra question bonus.

Teacher screen shows:

questions per team
questions per player
best question.

------------------------------------------------
QUIZ
------------------------------------------------

Quiz questions must use fullscreen historical images.

Images correspond to the question context.

Flow:

quiz_question
reveal
scoreboard_quiz

Reveal shows:

correct answer
team score delta
top teams.

------------------------------------------------
SCOREBOARDS
------------------------------------------------

Scoreboards must NEVER appear during gameplay.

Only after games.

Types:

scoreboard_terms
scoreboard_odd_one_out
scoreboard_question_maker
scoreboard_quiz

Teacher screen shows:

top 5 teams
risers
fallers.

------------------------------------------------
TIMING SYSTEM
------------------------------------------------

Game durations must be adjustable from teacher settings.

Fields:

reading_freeze_seconds
terms_seconds
odd_one_out_seconds
question_maker_seconds
quiz_seconds
reveal_seconds
scoreboard_seconds

Gemini can propose timings based on source word count.

Teacher can override them.

Session runtime must use:

session.settings values first
then storyboard defaults.

------------------------------------------------
STORYBOARD SYSTEM
------------------------------------------------

The storyboard editor defines the game structure.

Phases contain slides.

Slides contain elements.

Elements types include:

text
image
terms_input
odd_one_out_area
question_maker_ui
quiz_ui
scoreboard

The storyboard editor must show a REAL visual preview using the same renderer as the runtime game.

------------------------------------------------
TESTLAB AUTOPLAY
------------------------------------------------

Testlab simulates a full game with bots.

Features:

random source selection
team creation
bot joining
phase progression
QA assertions.

QA checks:

intro visible
reading visible
reading freeze ≈40s
terms instruction appears
terms input exists
odd_one_out present
scoreboard not during gameplay
quiz image visible
reveal visible
template elements render.

Failures generate a fix prompt.

------------------------------------------------
CURRENT STATUS
------------------------------------------------

Most runtime flow works.

Autoplay QA largely passes.

Remaining issues often involve:

storyboard structure inconsistencies
incorrect phase naming
missing instruction phases
UI markers missing
visual preview mismatch.

------------------------------------------------
DEVELOPMENT RULES
------------------------------------------------

Never reintroduce old chip_rain logic.

Never add extra reading phases.

Always maintain canonical phase names.

Storyboards must stay compatible with the runtime engine.

The template stored in Postgres is the authoritative source.

------------------------------------------------
YOUR TASK
------------------------------------------------

Continue development safely using this architecture.

Focus on:

fixing remaining flow inconsistencies
improving storyboard visual preview
ensuring Testlab QA remains reliable
keeping runtime and storyboard in sync.

Never redesign unrelated parts of the Lessie system.
