# Local Add-on Broken Link Checker

## Installation

### Clone

Clone the repository into the following directory depending on your platform:

-   macOS: `~/Library/Application Support/Local Beta/addons`

### Install Dependencies

1. `yarn install`

### Add to Local

1. `npm pack`
2. Install the newly generated tarball from disk within Local

### Alternate Method to Add to Local

1. Clone repo directly into the addons folder (paths described above)
2. `yarn install`
3. `npm run build`
4. Open Local and activate addon

## Development

### Folder Structure

All files in `/src` will be transpiled to `/lib` using [Babel](https://github.com/babel/babel/). Anything in `/lib` will be overwritten.

### Debug Logs

- Aside from the developer console, Local logs can be found (on Mac) at /Users/username/Library/Logs/local-beta.log

### Testing with Local

- Import site `/docs/LinkChecker_TestSite.zip` into Local and run Link Checker. This should result in several expected errors to occur.

## License

MIT
