/* ---------------------------------------------
 * color-picker.js - Custom Color Picker for Foundry Settings
 * Simple color picker that integrates with Foundry's settings system
 * --------------------------------------------- */

class ColorPickerSetting extends FormApplication {
  constructor(settingKey, options = {}) {
    super({}, options);
    this.settingKey = settingKey;
    this.currentColor = game.settings.get(settingKey.split('.')[0], settingKey.split('.')[1]);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "color-picker-setting",
      title: "Choose Color",
      template: "modules/art-for-daggerheart/templates/color-picker.hbs",
      width: 300,
      height: 350,
      resizable: false
    });
  }

  getData() {
    return {
      currentColor: this.currentColor,
      colors: [
        '#8f0000', '#ff0000', '#ff4444', '#ff8888', // Reds
        '#8f4500', '#ff8c00', '#ffa500', '#ffb84d', // Oranges
        '#8f8f00', '#ffff00', '#ffff4d', '#ffff80', // Yellows
        '#008f00', '#00ff00', '#44ff44', '#88ff88', // Greens
        '#008f8f', '#00ffff', '#44ffff', '#88ffff', // Cyans
        '#00008f', '#0000ff', '#4444ff', '#8888ff', // Blues
        '#8f008f', '#ff00ff', '#ff44ff', '#ff88ff', // Magentas
        '#000000', '#333333', '#666666', '#999999', // Grays
        '#cccccc', '#ffffff', '#8b4513', '#a0522d'  // Whites/Browns
      ]
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Color swatch clicks
    html.find('.color-swatch').click(this._onColorClick.bind(this));
    
    // Custom input
    html.find('#custom-color').on('input', this._onCustomInput.bind(this));
    
    // Buttons
    html.find('#apply-color').click(this._onApply.bind(this));
    html.find('#cancel-color').click(this._onCancel.bind(this));
  }

  _onColorClick(event) {
    const color = event.currentTarget.dataset.color;
    this.currentColor = color;
    
    // Update preview
    this.element.find('#color-preview').css('background-color', color);
    this.element.find('#custom-color').val(color);
    
    // Update selected state
    this.element.find('.color-swatch').removeClass('selected');
    event.currentTarget.classList.add('selected');
  }

  _onCustomInput(event) {
    const color = event.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      this.currentColor = color;
      this.element.find('#color-preview').css('background-color', color);
      this.element.find('.color-swatch').removeClass('selected');
    }
  }

  async _onApply(event) {
    const [moduleId, settingKey] = this.settingKey.split('.');
    await game.settings.set(moduleId, settingKey, this.currentColor);
    this.close();
  }

  _onCancel(event) {
    this.close();
  }
}

// Custom setting type registration
Hooks.once('ready', () => {
  // Register the color picker button in settings
  Hooks.on('renderSettingsConfig', (app, html, data) => {
    // Find our ring color setting
    const ringColorSetting = html.find('input[name="art-for-daggerheart.ringColor"]');
    if (ringColorSetting.length) {
      const wrapper = ringColorSetting.parent();
      
      // Hide the text input
      ringColorSetting.hide();
      
      // Add color preview and button
      const currentColor = game.settings.get('art-for-daggerheart', 'ringColor');
      const colorButton = $(`
        <div style="display: flex; align-items: center; gap: 10px;">
          <div id="ring-color-preview" style="
            width: 30px; 
            height: 30px; 
            border: 2px solid #ccc; 
            border-radius: 4px; 
            background-color: ${currentColor};
            cursor: pointer;
          "></div>
          <button type="button" id="ring-color-picker-btn" style="
            padding: 4px 8px;
            background: #4b4a44;
            border: 1px solid #7a7971;
            color: white;
            border-radius: 3px;
            cursor: pointer;
          ">Choose Color</button>
          <span style="color: #ccc; font-size: 12px;">${currentColor}</span>
        </div>
      `);
      
      wrapper.append(colorButton);
      
      // Handle color picker click
      colorButton.find('#ring-color-picker-btn, #ring-color-preview').click(() => {
        new ColorPickerSetting('art-for-daggerheart.ringColor').render(true);
      });
    }
  });
});