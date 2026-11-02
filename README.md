# oye

Flashcards for the 1000 most common words in spoken Spanish. Each card has audio, an example sentence and the stressed syllable marked.

- **Mixed card directions.** Listening cards play a word and you say what it means. Speaking cards show the English and you say it out loud.
- **Spaced repetition, Anki-style.** New words come back after 1 minute, then 10, then the next day, with intervals growing from there.
- **Rhythm bars.** One bar per syllable over each word, with the stressed one tall and colored: la com·pu·ta·**DO**·ra.
- **Base words, real forms.** Each card teaches the dictionary form (tener), and the note shows the forms you'll actually hear (tengo, tienes, tiene). Tap any form to hear it.
- **Spain vs Latin America.** Cards use the most widely understood word, and the note gives the other one where they differ (celular / móvil, computadora / ordenador).
- **Hover or tap any word in an example** to see what it means.
- **Works offline** and can be installed to your phone's home screen.

## Put it on GitHub Pages from the terminal

From the folder you unzipped (run `pwd` first, it should end in `/oye`):

```
git init
git add .
git commit -m "oye"
git branch -M main
gh repo create oye --public --source=. --push
gh api -X POST "repos/YOUR-USERNAME/oye/pages" -f "source[branch]=main" -f "source[path]=/"
```

A minute later it's live at `https://YOUR-USERNAME.github.io/oye/`.

## Audio

Audio uses your device's built-in Spanish voice. Settings explains how to add one if you don't have it. You can also pick a Mexican or Spain voice there.

## Your progress

Progress is saved in this browser only, and separately from tīngshuō. Use Settings → Export / Import to move it between devices.

## Editing words

Each line in `words.js` is one word:

```
["necesitar","ne|ce|si|*tar","to need","Necesito ayuda.","I need help.","note",["necesitar: to need","help"]]
```

The fields are: the word, its syllables (`*` marks the stressed one), English, example, example English, note, and the per-word hover glosses for the example. `{{tengo}}` in a note becomes a tappable word.

## Where the words come from

The ranking is from Spanish film and TV subtitle frequencies (OpenSubtitles 2018, via Hermit Dave's FrequencyWords). Word forms were grouped under their base word, so tengo, tienes and tiene all count toward tener. Cop-show vocabulary, names and slurs were cut. Essentials that subtitles undercount (days of the week, food, travel basics) were added and moved early in the study order. Every Spanish word on every card was spellchecked against the subtitle word list, and syllables and stress are computed from the spelling rules.

Fonts: Gentium Book Plus and Andika by SIL International (SIL Open Font License).
