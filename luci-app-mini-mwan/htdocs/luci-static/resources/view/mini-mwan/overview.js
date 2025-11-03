'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require fs';
var version = 'test5';

return view.extend({
	load: function() {
		return uci.load('mini-mwan');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('mini-mwan', _('Mini Multi-WAN'),
			_('Lightweight multi‑WAN manager for WireGuard tunnels with failover and load‑balancing.'));

		// Global settings section
		s = m.section(form.TypedSection, 'settings', _('Global Settings'));
		s.anonymous = true;
		s.addremove = false;

		o = s.option(form.Flag, 'enabled', _('Enable'),
			_('Enable Mini Multi-WAN service. At least two WAN interfaces must be configured.'));
		o.rmempty = false;
		o.default = '0';

		o = s.option(form.ListValue, 'mode', _('Mode'),
			_('Operating mode: failover (primary/backup) or multi-uplink (load balancing)'));
		o.value('failover', _('Failover (Primary/Backup)'));
		o.value('multiuplink', _('Multi-Uplink (Load Balancing)'));
		o.default = 'failover';
		o.rmempty = false;

		o = s.option(form.Value, 'check_interval', _('Check Interval'),
			_('How often to check WAN connectivity (seconds)'));
		o.datatype = 'range(10,3600)';
		o.default = '30';
		o.placeholder = '30';
		o.rmempty = false;

		// WAN Interfaces section
		s = m.section(form.GridSection, 'interface', _('WAN Interfaces'),
			_('WAN interface configuration for multi‑WAN management. Typically WireGuard tunnels (wg0, wg1, etc).'));
		s.anonymous = true;
		s.addremove = true;
		s.nodescriptions = true;
		s.sortable = true;

		s.modaltitle = function(section_id) {
			// section_id is now the device name (e.g., 'eth0', 'wg0')
			return _('WAN Interface') + ' » ' + section_id;
		};

		// Helper function to get smart default ping target
		var getSmartPingTarget = function() {
			var candidates = ['1.1.1.1', '8.8.8.8', '9.9.9.9', '1.0.0.1', '8.8.4.4', '208.67.222.222'];
			var sections = uci.sections('mini-mwan', 'interface');
			var used = {};
			for (var i = 0; i < sections.length; i++) {
				if (sections[i].ping_target) {
					used[sections[i].ping_target] = true;
				}
			}
			var pingTarget = candidates[0]; // default fallback
			for (var i = 0; i < candidates.length; i++) {
				if (!used[candidates[i]]) {
					pingTarget = candidates[i];
					break;
				}
			}
			return pingTarget;
		};

		// Custom add handler to prompt for device name with picker
		s.handleAdd = function(ev) {
			var self = this;

			// Load available network devices
			return fs.list('/sys/class/net').then(function(devices) {
				// Filter out loopback and already configured devices
				var availableDevices = [];
				var configuredDevices = {};

				// Get already configured devices
				var sections = uci.sections('mini-mwan', 'interface');
				for (var i = 0; i < sections.length; i++) {
					configuredDevices[sections[i]['.name']] = true;
				}

				// Filter devices
				if (devices) {
					for (var i = 0; i < devices.length; i++) {
						var devName = devices[i].name;
						// Skip loopback and already configured
						if (devName !== 'lo' && !configuredDevices[devName]) {
							availableDevices.push(devName);
						}
					}
				}

				// Sort devices
				availableDevices.sort();

				// Build select options
				var selectElement = E('select', {
					'id': 'device_select',
					'class': 'cbi-input-select',
					'style': 'width: 100%'
				});

				// Add placeholder option
				selectElement.appendChild(E('option', { 'value': '' }, _('-- Select a device --')));

				// Add available devices
				for (var i = 0; i < availableDevices.length; i++) {
					selectElement.appendChild(E('option', { 'value': availableDevices[i] }, availableDevices[i]));
				}

				return ui.showModal(_('Add WAN Interface'), [
					E('div', { 'class': 'cbi-section' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Device')),
							E('div', { 'class': 'cbi-value-field' }, [
								selectElement,
								E('div', { 'class': 'cbi-value-description' },
									_('Select a network interface device. This will be used as the section identifier.'))
							])
						])
					]),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'btn',
							'click': ui.hideModal
						}, _('Cancel')),
						E('button', {
							'class': 'btn cbi-button-action',
							'click': ui.createHandlerFn(self, function(ev) {
								var select = document.getElementById('device_select');
								var device = select.value;

								if (!device) {
									ui.addNotification(null, E('p', _('Please select a device')), 'error');
									return;
								}

								// Check if device already exists
								var sections = uci.sections('mini-mwan', 'interface');
								for (var i = 0; i < sections.length; i++) {
									if (sections[i].device === device) {
										ui.addNotification(null, E('p', _('Interface with device "%s" already exists').format(device)), 'error');
										return;
									}
								}

								// Create anonymous section
								var sid = uci.add('mini-mwan', 'interface');

								// Set default values
								var pingTarget = getSmartPingTarget();
								console.log('[mini-mwan] Adding interface:', device);
								console.log('[mini-mwan] Section ID:', sid);
								console.log('[mini-mwan] Ping target:', pingTarget);

								uci.set('mini-mwan', sid, 'device', device);
								uci.set('mini-mwan', sid, 'ping_target', pingTarget);
								uci.set('mini-mwan', sid, 'metric', '10');
								uci.set('mini-mwan', sid, 'weight', '3');
								uci.set('mini-mwan', sid, 'ping_count', '3');
								uci.set('mini-mwan', sid, 'ping_timeout', '2');

								console.log('[mini-mwan] Saving...');
								return self.map.save().then(function() {
									console.log('[mini-mwan] Saved successfully');
									ui.hideModal();
								}).catch(function(err) {
									console.error('[mini-mwan] Save error:', err);
									ui.hideModal();
								});
							})
						}, _('Add'))
					])
				]);
			}).catch(function(err) {
				// Fallback to manual input if can't read /sys/class/net
				return ui.showModal(_('Add WAN Interface'), [
					E('div', { 'class': 'cbi-section' }, [
						E('div', { 'class': 'cbi-value' }, [
							E('label', { 'class': 'cbi-value-title' }, _('Device Name')),
							E('div', { 'class': 'cbi-value-field' }, [
								E('input', {
									'type': 'text',
									'id': 'device_input',
									'placeholder': 'eth0, wg0, etc.',
									'style': 'width: 100%'
								}),
								E('div', { 'class': 'cbi-value-description' },
									_('Network interface device name. This will be used as the section identifier.'))
							])
						])
					]),
					E('div', { 'class': 'right' }, [
						E('button', {
							'class': 'btn',
							'click': ui.hideModal
						}, _('Cancel')),
						E('button', {
							'class': 'btn cbi-button-action',
							'click': ui.createHandlerFn(self, function(ev) {
								var input = document.getElementById('device_input');
								var device = input.value.trim();

								if (!device) {
									ui.addNotification(null, E('p', _('Device name cannot be empty')), 'error');
									return;
								}

								// Check if device already exists
								var sections = uci.sections('mini-mwan', 'interface');
								for (var i = 0; i < sections.length; i++) {
									if (sections[i].device === device) {
										ui.addNotification(null, E('p', _('Interface with device "%s" already exists').format(device)), 'error');
										return;
									}
								}

								// Create anonymous section
								var sid = uci.add('mini-mwan', 'interface');

								// Set default values
								uci.set('mini-mwan', sid, 'device', device);
								uci.set('mini-mwan', sid, 'metric', '10');
								uci.set('mini-mwan', sid, 'weight', '3');
								uci.set('mini-mwan', sid, 'ping_count', '3');
								uci.set('mini-mwan', sid, 'ping_timeout', '2');
								uci.set('mini-mwan', sid, 'ping_target', getSmartPingTarget());

								return self.map.save().then(function() {
									ui.hideModal();
								}).catch(function(err) {
									ui.hideModal();
								});
							})
						}, _('Add'))
					])
				]);
			});
		};

		// Use device name as section title in grid
		s.sectiontitle = function(section_id) {
			var device = uci.get('mini-mwan', section_id, 'device');
			return device || section_id;
		};

		// Device field - first field, non-editable
		o = s.option(form.Value, 'device', _('Device'),
			_('Network interface device name'));
		o.rmempty = false;
		o.editable = false; // Cannot change device after creation

		o = s.option(form.Value, 'ping_target', _('Ping Target'),
			_('IP address to ping for connectivity check'));
		o.datatype = 'ipaddr';
		o.rmempty = false;
		o.editable = true;

		// Validate no duplicate ping targets
		o.validate = function(section_id, value) {
			if (!value) return true;

			// Check for duplicate ping targets
			var sections = uci.sections('mini-mwan', 'interface');
			for (var i = 0; i < sections.length; i++) {
				if (sections[i]['.name'] !== section_id &&
				    sections[i].ping_target === value) {
					return _('Ping target "%s" is already used by another interface').format(value);
				}
			}
			return true;
		};

		o = s.option(form.Value, 'metric', _('Metric'),
			_('Route metric (lower = higher priority). Used in failover mode only.'));
		o.datatype = 'range(1,255)';
		o.default = '10';
		o.editable = true;
		o.rmempty = false;

		o = s.option(form.Value, 'weight', _('Weight'),
			_('Traffic distribution weight for multi-uplink mode. Used in multi-uplink mode only.'));
		o.datatype = 'range(1,10)';
		o.default = '3';
		o.editable = true;
		o.rmempty = false;

		// Advanced settings - only in modal
		o = s.option(form.Value, 'ping_count', _('Ping Count'),
			_('Number of ping attempts'));
		o.datatype = 'range(1,10)';
		o.default = '3';
		o.placeholder = '3';
		o.optional = true;
		o.modalonly = true;

		o = s.option(form.Value, 'ping_timeout', _('Ping Timeout'),
			_('Ping timeout (seconds)'));
		o.datatype = 'range(1,10)';
		o.default = '2';
		o.placeholder = '2';
		o.optional = true;
		o.modalonly = true;

		return m.render();
	}
});
