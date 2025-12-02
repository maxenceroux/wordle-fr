# wordle-fr

"Le Mot" also called "WordleFR" is a game, freely inspired by ["Wordle"](https://www.powerlanguage.co.uk/wordle/) made by [Josh Wardle](https://twitter.com/powerlanguish).

The idea, the concept and the design were, for the most part, taken from the original project.

You can find Le Mot at this URL : [wordle.louan.me](https://wordle.louan.me)

## 🐳 Docker Setup (NEW!)

This project now includes full Docker support with SQLite persistence for scores and word of the day!

### Quick Start with Docker

```bash
# Start the application
./start.sh

# Or manually with docker-compose
docker-compose up -d
```

**Access the app at:** http://localhost

For detailed Docker documentation, see [README_DOCKER.md](README_DOCKER.md)

### Features
- ✅ SQLite database for persistent score tracking
- ✅ Username-based score system with local caching
- ✅ Word of the day storage
- ✅ Leaderboard and statistics API
- ✅ Full Docker containerization

## Contacts

[@louanben](https://twitter.com/louanben) on Twitter
or
louanben.pro@gmail.com

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
You'll need @vue/cli-service for this to work.


See [Configuration Reference](https://cli.vuejs.org/config/).


