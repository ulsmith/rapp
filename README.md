# RAPP

Razilo application base using node + express to serve a standalone user interface built on the razilo libraries raziloBind and raziloComponent. This base will provide you with the starting point to build your first interactive javscript standalone application user interface. Using the razilo lirabries you will be able to create HTML views and enrich them with data binding, off the shelf custom components (raziloComponents) and your own custom web components.

Generel rules here that I like to follow, file extensions should also describe the file...

something.component.html
something.service.html
something.test.html

That kind of thing, it helps to better visualize the structure of the application just by looking at the files, and allows us to mixed files together. In addition to this, we try to also give a basic structure that suits a JS UI application, feel free to play with this setup.


__assets/:__ Any /images, /logic, /partials, basically reasources accessed by a client from the browser.

__build/:__ Any built files, we do this seperately from assets to allow us to nuke the build folder and regen it and contents easily during dev if needed.

__src/:__ All source code for our project which is dedicated to our project.

__src/app:__ Your main application folder, with components split into a navigatable type structure to match the URL addresses. These are routable comonent structures, pages so to speak.

__src/shared:__ Your shared application folder, a structure of components that do not fit into the application structure so to speak, but are consumed by the application at various places.

__index.html:__ The index page for your application, the html page that will bootstrap your application.

__index.es6.js:__ The index logic for your application, will import in all dependencies needs to make your application function like polyfills, razilo tools, 3rd party site wide resources that kind of thing.
Feel free to omit this file for the pre build 3rd party files added to your index.html instead.

__index.scss:__ Your base style, stuff that is site wide, compile in things like bootstrap scss, other libraries, set base style and site wide things.


## Running

Clone RAPP and install dependencies via npm. This comes with support for es6 compiling via bable and gulp. You will need to build your output logic and style before navigating to the project.

```bash
git clone https://github.com/ulsmith/rapp.git
npm install
gulp build
```

RAPP runs on docker using a node:latest base, so you will need to create your own docker-compose.yml file (or run docker command directly) to build and run RAPP (recommended). RAPP builds on top of the base image to install things from npm, copy files over etc. In development I recommend mapping your volume so you do not have to keep pulling down and up your containers.


Once you have altered your docker-compose.yml file to suit your needs, you can fire up the container.

```bash
# basic command to build image (if none), create container (if none) and start container
docker-compose up

# above and return to command line
docker-compose up -d

# basic command to stop container
docker-compose stop

# basic command to stop container, delete container and any docker networks
docker-compose down
```

Depending on how you are using RAPP, you may wish to build on save of files, to do this, use `gulp watch` to build, then watch for changes and re-build when a file is filed. Please configure this command in your gulp file to your liking. If working purely
with components, and you are working from source (imported the source files directly) then you will not need to build during dev, html imports will pull in all files individually, caching them as it goes. You can run your site in this way too in production,
don't be fooled by those telling you 'You have to build for production', be pragmatic and think for yourself, bundle/compile when the need arises i.e. the benefits are clear. Browsers these days can do more simultaniuos requests, so you need to trade off pulling everything in once just to view one page versus lazy loading to get a happy medium. You can also take a bundling approach that supports lazy loading by bundling per page, but please beware you could duplicate component registrations, so best to bundle or not. For larger applications, I tend to lazy load page components and bundle site wide things.

Quite simple we will not tell you how to manage your dependancies, this is up to you, we provide html imports (polyfilled for older browsers), but it is up to yo uwhere and how you import deps. The vulcanize tool in gulp build and watch is capable of following the trail and ommiting duplicates, so play with this until you get something that works well for you.

If using the RAPP image directly, you will require a first off build, to compile all 3rd party modules as they are ES6 based, after that, if importing project from source no building is needed. If your index.html is using the bundled vulc file (vulcanized) as the entry point to the application, you will need to watch for changes in src and rebuild on save using gulp or other task runner.


## Testing

At present not included but will be shortly ala jasmine or other...
