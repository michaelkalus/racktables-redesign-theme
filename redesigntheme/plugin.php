<?php

// RackTables Redesign Theme - plugin (new plugin architecture, RackTables 0.21+).
// Core layer (CSS only): design tokens, IBM Plex fonts and Lucide icons hosted
// locally, 52 px header, cards, tables, tag chips, forms, rack diagram colored
// by object type. Enhanced layer (optional JS): header search with "/" shortcut,
// table density switch, copy IP/MAC, version in footer, filter for long lists.
// No database tables, no config variables: install/uninstall only toggle it.

function plugin_redesigntheme_info ()
{
	return array
	(
		'name' => 'redesigntheme',
		'longname' => 'Redesign Theme',
		'version' => '2.1.1',
		'home_url' => '',
	);
}

function plugin_redesigntheme_init ()
{
	// Served by RackTables itself (?module=chrome&uri=...) from $local_staticdir,
	// which defaults to the plugins/ directory.
	// RackTables sends no viewport meta; without it phones render a zoomed out 980 px page.
	addPageHeader ('<meta name="viewport" content="width=device-width, initial-scale=1">', 'default');
	addCSSInternal ('redesigntheme/css/fonts.css');
	addCSSInternal ('redesigntheme/css/theme.css');
	addJSInternal ('redesigntheme/js/select-filter.js');
	addJSInternal ('redesigntheme/js/enhance.js');
	redesigntheme_index_layout();
	try
	{
		redesigntheme_rack_type_css();
	}
	catch (Exception $e)
	{
		// Type colors are cosmetic; never break a page because of them.
	}
}

// Main page: Infrastructure rows first, Management row last (4 tiles per row).
// Tiles the user may not open are still hidden by RackTables (permitted()).
function redesigntheme_index_layout ()
{
	global $indexlayout;
	$indexlayout = array
	(
		array ('rackspace', 'depot', 'cables', 'ipv4space'),
		array ('ipv6space', '8021q', 'ipv4slb', 'virtual'),
		array ('files', 'reports', 'objectlog', 'config'),
	);
}

// Object type -> color group used by the rack diagram. Stock dictionary IDs;
// site specific types are matched by name below.
function redesigntheme_type_group ($objtype_id, $type_name)
{
	$by_id = array
	(
		4 => 'server', 1502 => 'server', 5 => 'server', 6 => 'server',
		7 => 'network', 8 => 'network', 1503 => 'network', 1055 => 'network',
		965 => 'network', 13 => 'network', 14 => 'network', 447 => 'network',
		798 => 'firewall',
		9 => 'passive', 10 => 'passive', 11 => 'passive', 3 => 'passive',
		2 => 'power', 12 => 'power', 1397 => 'power', 1398 => 'power',
	);
	if (isset ($by_id[$objtype_id]))
		return $by_id[$objtype_id];
	$n = mb_strtolower ((string) $type_name);
	if (preg_match ('/odf|optic|optick|fiber|fibre|vlakn/u', $n))
		return 'optic';
	if (preg_match ('/firewall|security|asa|fortigate/u', $n))
		return 'firewall';
	if (preg_match ('/switch|router|network|sit/u', $n))
		return 'network';
	if (preg_match ('/server|storage|nas|disk/u', $n))
		return 'server';
	if (preg_match ('/patch|panel|vyvaz|organizer|shelf|polic|fan|ventil/u', $n))
		return 'passive';
	if (preg_match ('/ups|pdu|power|napaj/u', $n))
		return 'power';
	return 'other';
}

// Adds one CSS rule per mounted object on rack and object pages, so the rack
// diagram can color blocks by object type. Pure CSS (:has), no JS needed.
function redesigntheme_rack_type_css ()
{
	// Only for HTML pages that render a rack diagram (rack view, object view).
	// Plugins run before RackTables checks page permissions, so keep this cheap
	// and limited to the interface module; the query only reads object types.
	$module = isset ($_REQUEST['module']) ? $_REQUEST['module'] : 'interface';
	$page = isset ($_REQUEST['page']) ? $_REQUEST['page'] : '';
	if ($module != 'interface')
		return;
	$rack_ids = array();
	if ($page == 'rack' && isset ($_REQUEST['rack_id']))
		$rack_ids[] = intval ($_REQUEST['rack_id']);
	elseif ($page == 'object' && isset ($_REQUEST['object_id']))
		// same racks RackTables shows on the object page (own, parent's, Zero-U)
		foreach (getResidentRackIDs (intval ($_REQUEST['object_id'])) as $id)
			$rack_ids[] = intval ($id);
	$rack_ids = array_values (array_unique ($rack_ids));
	if (! count ($rack_ids))
		return;
	$result = usePreparedSelectBlade
	(
		'SELECT DISTINCT o.id, o.objtype_id, d.dict_value FROM RackSpace rs ' .
		'JOIN Object o ON o.id = rs.object_id ' .
		'LEFT JOIN Dictionary d ON d.dict_key = o.objtype_id ' .
		'WHERE rs.rack_id IN (' . implode (',', array_fill (0, count ($rack_ids), '?')) . ')',
		$rack_ids
	);
	$groups = array();
	foreach ($result->fetchAll (PDO::FETCH_ASSOC) as $row)
	{
		$g = redesigntheme_type_group (intval ($row['objtype_id']), $row['dict_value']);
		if ($g == 'other')
			continue;
		$groups[$g][] = intval ($row['id']);
	}
	if (! count ($groups))
		return;
	$css = '';
	foreach ($groups as $g => $ids)
	{
		$sel = array();
		foreach ($ids as $id)
			$sel[] = "table.rack td.atom.state_T:has(> div > a[href\$=\"object_id={$id}\"])";
		$css .= implode (",\n", $sel) . " { --rt-atom-bg: var(--rt-k-{$g}-bg); --rt-atom-bd: var(--rt-k-{$g}-bd); --rt-atom-fg: var(--rt-k-{$g}-fg); }\n";
	}
	addCSSText ($css);
}

function plugin_redesigntheme_install ()
{
	return TRUE;
}

function plugin_redesigntheme_uninstall ()
{
	return TRUE;
}

function plugin_redesigntheme_upgrade ()
{
	return TRUE;
}
