const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Fix syntax error and layout
const brokenStr = `<div          <div class="now-playing-panel glass-card enlarged-playing" id="now-playing-panel">`;

const fixedStr = `<div id="quick-suggestions-list" class="suggestions-list">
                <!-- Javascript will populate this -->
              </div>
            </div>
          </div> <!-- Close request-card -->
        </section> <!-- Close request-section -->

        <section class="grid-col main-content">
          <div class="now-playing-panel glass-card enlarged-playing" id="now-playing-panel">`;

html = html.replace(brokenStr, fixedStr);

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Fixed index.html structure');
