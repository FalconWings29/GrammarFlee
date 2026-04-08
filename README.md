# Grammarflee

Grammarflee is the opposite of Grammarly. Instead of fixing your writing, it ruins it on purpose.

## What It Does

Grammarflee takes normal, well written text and makes it worse by:
- breaking sentence structure
- swapping correct words with incorrect ones
- adding random punctuation
- messing up capitalization
- introducing grammar mistakes

You put clean writing in and get cursed writing out.

## Example

**Input**
```text
I am going to the store to buy some groceries.
```

**Output**
```text
i am going too the store, too buy some grocerie's???
```

## Features

- Grammar corruption engine
- Randomized mistakes
- Adjustable chaos levels
- Fast text processing
- Intentionally incorrect suggestions

## Installation

```bash
git clone https://github.com/yourusername/grammarflee.git
cd grammarflee
npm install
npm start
```

## Usage

```javascript
import { corruptText } from "grammarflee";

const input = "This is a perfectly written sentence.";
const output = corruptText(input);

console.log(output);
```

## Chaos Levels

- **Level 1**: Small mistakes that are barely noticeable
- **Level 2**: Slightly awkward phrasing and errors
- **Level 3**: Clearly incorrect grammar
- **Level 4**: Hard to read
- **Level 5**: Complete linguistic disaster

## Why

Not everything needs to be polished. Sometimes it is more fun to break language on purpose.

## Disclaimer

Do not use Grammarflee for:
- essays
- emails to teachers
- job applications
- anything serious

## Roadmap

- Chrome extension
- Real time typing corruption
- Bad writing style presets
- Social media integration
