1.Set up the .env in parent folder follow .env.example

2.Install node Modules
npm i

Three endpoints are available.
Run in following sequence

POST http://localhost:PORT/api/v1/scrape

Input:

{
    "url": "https://example.com/"
}

POST http://localhost:PORT/api/v1/generate-reel-script

No Input needed

POST http://localhost:PORT/api/v1/generate-reel

No Input Needed.