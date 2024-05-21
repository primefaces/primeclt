# Welcome to PrimeCLT!

primeclt is a Command Line Tool (CLT) package designed for use with PrimeVue. It is currently in beta and compatible exclusively with Vue and Vite projects.

## Installation

To install the PrimeCLT, run the following command:

```bash
npm install -g primeclt
```

## Commands

| Command                 | Description                                                                                                                                             | Options                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| prime vue install       | Installs PrimeVue and imports it                                                                                                                        | Vite                         |
| prime vue create        | Creates a project for Vite                                                                                                                              | Vite                         |
| prime vue preset        | Downloads the primevue presets to the current directory                                                                                                 | Vite                         |
| prime vue update-preset | Update cache and project preset                                                                                                                         | Vite                         |
| prime vue clear-cache   | Removes the cached preset files                                                                                                                         | Vite                         |
| prime uninstall         | Uninstalls PrimeClT                                                                                                                                     | Vite                         |
| prime pf2tw             | Converts PrimeFlex classes to Tailwind CSS classes (Usable on multiple folders and files. E.g: ./src/components will check every folder and every file) | .js .ts .jsx .tsx .vue .html |
