'use strict';
'require view';
'require form';
'require uci';
'require ui';
'require fs';

return view.extend({
	load: function() {
		return uci.load('mini-mwan');
	},

	render: function() {
		var m, s, o;

		m = new form.Map('mini-mwan', _('Mini Multi-WAN'),
			_('Lightweight multi-WAN manager for WireGuard tunnels with failover and load-balancing.'));

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
		s = m.section(form.TableSection, 'interface', _('WAN Interfaces'),
			_('WAN interface configuration for multi-WAN management. Typically WireGuard tunnels (wg0, wg1, etc).'));
		s.anonymous = true;
		s.addremove = true;

		o = s.option(form.Value, 'device', _('Device'),
			_('Network interface device name (e.g., wg0, eth1)'));
		o.rmempty = false;
		o.placeholder = 'wg0';

		o = s.option(form.Value, 'ping_target', _('Ping Target'),
			_('IP address to ping for connectivity check'));
		o.datatype = 'ipaddr';
		o.rmempty = false;
		o.placeholder = '1.1.1.1';

		o = s.option(form.Value, 'metric', _('Metric'),
			_('Route metric (lower = higher priority). Used in failover mode.'));
		o.datatype = 'range(1,255)';
		o.default = '10';
		o.placeholder = '10';

		o = s.option(form.Value, 'weight', _('Weight'),
			_('Traffic distribution weight. Used in multi-uplink mode.'));
		o.datatype = 'range(1,10)';
		o.default = '3';
		o.placeholder = '3';

		o = s.option(form.Value, 'ping_count', _('Ping Count'),
			_('Number of ping attempts'));
		o.datatype = 'range(1,10)';
		o.default = '3';
		o.placeholder = '3';
		o.optional = true;

		o = s.option(form.Value, 'ping_timeout', _('Ping Timeout'),
			_('Ping timeout (seconds)'));
		o.datatype = 'range(1,10)';
		o.default = '2';
		o.placeholder = '2';
		o.optional = true;

		return m.render();
	}
});
