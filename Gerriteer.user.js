// ==UserScript==
// @name        Gerriteer
// @namespace   http://brightbyte.de/gm/
// @description Make the Wikimedia Gerrit Dashboard usable. Use with Gerrit 2.12.
// @include     https://gerrit.wikimedia.org/
// @include     https://gerrit.wikimedia.org/r/
// @include     https://gerrit.wikimedia.org/r/#/*
// @version     1
// @grant       none
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==

var cssrules =  $( "<style type='text/css'> </style>" ).appendTo( "head" );

cssrules.append( "tr.status-Draft td.dataCell, tr.status-Draft a.gwt-InlineHyperlink { color:#AAA !important; }" ); 
cssrules.append( "tr.status-Abandoned td.dataCell, tr.status-Abandoned a.gwt-InlineHyperlink { color:#AAA !important; }" ); 
cssrules.append( "td.cSTATUS { font-weight: bold; }" ); 
cssrules.append( "tr.status-Merged td.cSTATUS { color: green !important; }" ); 
cssrules.append( "tr.age-old { display: none; }" ); //TODO: per default, hide on dashboard, but show on search!

console.log( "init!" );

var changeTableProcessor = {
	section: "top",
	
	processTable: function( $table ) {
		this.section = "top";
		
		if ( $table.hasClass( "gerriteer-processed" ) ) {
			console.log(".changeTable already processed, aborting" );
			return;
		} 

		$table.addClass( "gerriteer-processed" );
		
		var tableClass = this.classifyTable( $table );
		
		if ( tableClass != '' ) {
			console.log("processing table rows for class ", tableClass );
			
			this.addButtons( $table );
			self = this;
			
			$table.find("tr").each( function( i, row ) {
				self.processRow( row )
			} );
		} else {
			console.log("skipped table: ", $table );
		}
	},
	
	toggleShow: function( $button, $base, selector, offLabel, onLabel ) {
		var isOn = $button.hasClass( 'gerriteer-toggle-on' );
		
		if ( isOn ) {
			console.log( "toggleShow: turn off" );
			$button.toggleClass( 'gerriteer-toggle-off', true );
			$button.toggleClass( 'gerriteer-toggle-on', false );
			$button.text( onLabel );
			$base.find( selector ).hide();
		} else {
			console.log( "toggleShow: turn on" );
			$button.toggleClass( 'gerriteer-toggle-off', false );
			$button.toggleClass( 'gerriteer-toggle-on', true );
 			$button.text( offLabel );
			$base.find( selector ).show();
		}
	},
	
	addButtons: function ( $table ) {
		$firstRow = $table.find( 'tr:first' );
		$firstRow.before( '<tr><td colspan="10" id="gerriteer-changes-table-buttons"><button id="gerriteer-old-changes-button" class="gerriteer-toggle-off">show old</a></td></tr>' )
		
		$showOld = $table.find( '#gerriteer-old-changes-button' );
		self = this;
		
		$showOld.click( function( ev ) { 
			self.toggleShow( $showOld, $table, '.age-old', 'hide old!', 'show old!' )
		} );
	},
	
	processRow: function ( row ) {
		if ( row.cells.length < 10 ) {
			$header = $( row ).find( '.sectionHeader' );
			
			if ( $header.length ) {
				var name = $header.text().replace( / /, '_' );
				console.log( 'Section: ' + name );
				this.section = name
			}

			return;
		}
		
		this.rearrangeRow( row );
		this.classifyRow( row );
	},

	rearrangeRow: function ( row ) {
		var cellSubject = row.cells[3];
		var cellStatus = row.cells[4];
		var cellSize = row.cells[9];
		var cellCR = row.cells[10];
		var cellV =  row.cells[11];

		var status = $.text( cellStatus );
		
		cellStatus.title = status;
		cellStatus.textContent = status.substring( 0, 1 );
		cellStatus.className += ' cSTATUS';

		row.insertBefore( cellStatus, cellSubject );
		row.insertBefore( cellV, cellSubject );
		row.insertBefore( cellCR, cellSubject );
	},

	classifyRow: function ( row ) {
        	// NOTE: column indexes AFTER rearrangeRow() was applied.
		var cellIcon = row.cells[1];
                var cellStatus = row.cells[3];	
                var cellUpdated = row.cells[10];	

		var $icon = $( cellIcon ).children( 'img' );
                var iconStyle = $icon.length == 0 ? null : $icon.attr( 'style' );

                var status = cellStatus.title;
		var updated = $.text( cellUpdated );

                var oldExp = /.*(month|year|weeks).*/
		var starredExp = /.*data:image\/gif;base64,R0lGODlhDwAPALMAAGho4ZeX6\/.*/
		
		row.className += " section-" + this.section;
		row.className += " status-" + ( status == '' ? 'Pending' : status );
		
		if ( iconStyle && iconStyle.match( starredExp ) ) {
                    row.className += " flag-starred";
		} else if ( updated.match( oldExp ) ) {
			row.className += " age-old";
		}
	},

	classifyTable: function ( $table ) {
		var tableClass = '';
		
		if ( $table.find( '.cAPPROVAL' ).length > 0 ) {
			if ( $table.find( '.sectionHeader' ).length > 0 ) {
				tableClass = 'dashboard-table';
			} else {
				tableClass = 'changes-table';
			}
		}
		
		$table.addClass( tableClass );
		return tableClass;
	}
}

function tryProcessRows ( $base, processor, delay, expire ) {
	var $table = $base.find( ".changeTable" );
	
	if ( $table.is(':visible') ) {
		processor.processTable( $table );
	} else if ( delay > 0 ) {
		console.log("no .changeTable yet, trying again in " + delay + "ms" );
		setTimeout( function() {
			tryProcessRows( $base, processor, delay, expire - delay );
		}, delay );
	} else {
		console.log("no .changeTable found, giving up" );
	}
}

$( document ).ready(function() {
	console.log( "document ready!" );
	tryProcessRows( $( document ), changeTableProcessor, 300, 10000 );
	
	document.addEventListener( 'DOMNodeInserted', function( ev ) {
		var $target = $( ev.target );
		if ( $target.hasClass( 'screen' ) )  {
			console.log( 'screen changed', ev.target );
			tryProcessRows( $target, changeTableProcessor, 300, 10000 );
		}
	} );
});
