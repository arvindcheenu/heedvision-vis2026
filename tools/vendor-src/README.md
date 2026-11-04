`slides/vendor/magic-move.js` is this entry file bundled with its dependencies:

    npm i @shikijs/magic-move shiki esbuild
    npx esbuild magic-move.entry.mjs --bundle --format=esm --minify --outfile=slides/vendor/magic-move.js

To support another language, import its grammar in the entry file and add it to `langs`.
