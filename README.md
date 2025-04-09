# ⚠ Archived ⚠

This Local Addon is archived and no longer receives updates. See the [Link Checker Help Doc](https://localwp.com/help-docs/local-features/link-checker/) for details and alternatives for scanning a site for broken links.


# Local Add-on Broken Link Checker

A [Local](https://localwp.com/) add on for searching for broken links on your WordPress site. This repository hosts the source code; if you simply want to use the add-on, download the latest version of local from [the release page](https://localwp.com/releases/) and install the add-on within the app.

## Manual Installation & Development setup

*If you haven't already, it is advised that you familiarize yourself with the basics of [electron](https://www.electronjs.org/).*
### Clone

Clone the repository into one of the following directories depending on your platform:

-   macOS: `~/Library/Application\ Support/Local/addons`
-   Windows: `C:\Users\username\AppData\Roaming\Local\addons`
-   Linux: `~/.config/Local/addons`

*You need to replace 'Local' with 'Local Beta' in the above paths if you want to create the add-on for Local Beta.*

If you prefer to clone your source code elsewhere, you can do so and then symlink that directory to one in the above mentioned directories.

An example of this on MacOS would look like:

```
git clone git@github.com:getflywheel/local-addon-broken-link-checker.git ~/code

ln -s ~/code/local-addon-borken-link-checker ~/Library/Application\ Support/Local/addons
```
### Install Dependencies

`yarn install` or `npm install`

### Build

`yarn build` or `npm run build`

You can also choose to watch for changes using `yarn watch`
### Add to Local

1. `npm pack`
2. Install the newly generated tarball from disk within Local

### Alternate Method to Add to Local

1. Clone repo directly into the add-ons folder (paths described above)
2. `yarn install` or `npm install` (install dependencies)
3. `yarn build` or `npm run build`
4. Open Local and enable add-on

If the enabling the add-on via the Local UI doesn't work for some reason, you can also enable it by updating the file `enabled-addons.json`. This is located at one of the following application specific paths.

You'll want to make sure that the json file includes:

`"@getflywheel/local-addon-broken-link-checker": true`

-	macOS: `~/Library/Application\ Support/Local/enabled-addons.json`
-   Linux: `~/.config/Local/enabled-addons.json`
-   Windows: `C:\Users\<username>\AppData\Roaming\Local\addons\enabled-addons.json`

## Development

### External Libraries

- @getflywheel/local provides type definitions for Local's Add-on API.
	- Node Module: https://www.npmjs.com/package/@getflywheel/local-components
	- GitHub Repo: https://github.com/getflywheel/local-components

It is worth noting the the TS definitions for this module are exposed and publicly availble. The actual code is injected once the add-on is loaded by Local. This can make writing tests a little tricky as the `@getflywheel/local/<main/renderer>` module isn't available outside of Local (ie testing unit testing environments). The best option is to mock out this module while running tests.

- @getflywheel/local-components provides reusable React components to use in your Local add-on.
	- Node Module: https://www.npmjs.com/package/@getflywheel/local
	- GitHub Repo: https://github.com/getflywheel/local-addon-api
	- Style Guide: https://getflywheel.github.io/local-components

### Folder Structure

All files in `/src` will be transpiled to `/lib` using [Babel](https://github.com/babel/babel/). Anything in `/lib` will be overwritten.

### Debug Logs

- Aside from the developer console, Local logs can be found (on Mac) at /Users/username/Library/Logs/local-beta.log

### Testing with Local

- Import site `/docs/LinkChecker_TestSite.zip` into Local and run Link Checker. This should result in several expected errors to occur.

## License

MIT
