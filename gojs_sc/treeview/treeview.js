var strDivId, strAppEdit, strAppSave;
function drawChart(divId,appEdit,appSave) {    
	strDivId = divId;
	strAppEdit = appEdit;
	strAppSave = appSave;
	
	//CONVENÇÃO DO GO.JS, ATRIBUINDO DADOS BASICOS À VARIÁVEL $ PARA FACILITAR A REUTILIZAÇÃO.
	var $ = go.GraphObject.make;

	//CONFIGURAÇÕES DA DIV.
	myDiagram =
		$(go.Diagram, strDivId,
		  {
			  allowMove: false, // Impede movimentar
			  allowCopy: false, // Impede copiar
			  allowDelete: false, // Impede deletar
			  allowHorizontalScroll: false, // Impede scroll horizontal
			  layout:
			  $(go.TreeLayout, 
				{
					/*								sorting: go.TreeLayout.SortingAscending,
								comparer: function(va, vb) {
									var da = va.node.data;
									var db = vb.node.data;
									if (da.someProperty < db.someProperty) return -1;
									if (da.someProperty > db.someProperty) return 1;
									return 0;
								} */
					alignment: go.TreeLayout.AlignmentStart,
					angle: 0,
					compaction: go.TreeLayout.CompactionNone,
					layerSpacing: 16,
					layerSpacingParentOverlap: 1,
					nodeIndent: 2,
					nodeIndentPastParent: 0.88,
					nodeSpacing: 0,
					setsPortSpot: false,
					setsChildPortSpot: false,
					sorting: go.TreeLayout.SortingAscending
				}
			   )
		  }
		 );//FIM CONFIGURAÇÕES DA DIV.

	//CONFIGURAÇÃO DO TEMPLATE DO NÓ.
	myDiagram.nodeTemplate =
		$(go.Node, 
		  {   //selectionAdorned: false, // sem adorno: altere a cor do plano de fundo do painel vinculando-se ao nó.
			  // uma função personalizada para permitir expandir / colapsar em duplo clique
			  // isso usa lógica semelhante a um TreeExpanderButton
			  doubleClick: function(e, node) 
			  {
				  var cmd = myDiagram.commandHandler;
				  if (node.isTreeExpanded) {
					  if (!cmd.canCollapseTree(node)) return;
				  } else {
					  if (!cmd.canExpandTree(node)) return;
				  }

				  e.handled = true;
				  if (node.isTreeExpanded) {
					  cmd.collapseTree(node);
				  } else {
					  cmd.expandTree(node);
				  }
			  }
		  }, $("TreeExpanderButton", 
			   {
				   width: 14,
				   "ButtonBorder.fill": "whitesmoke",
				   "ButtonBorder.stroke": null,
				   "_buttonFillOver": "rgba(0,128,255,0.25)",
				   "_buttonStrokeOver": null
			   }
			  ),	$(go.Panel, "Horizontal", 
					  {
						  position: new go.Point(16, 0)
					  },
					  new go.Binding("background", "isSelected", function (s) { return (s ? "lightblue" : "white");                 																					}).ofObject(),
					  $(go.Picture, 
						{
							width: 18, height: 18,
							margin: new go.Margin(0, 4, 0, 0),
							imageStretch: go.GraphObject.Uniform
						},

						// vincular a fonte da imagem em duas propriedades do nó
						// para exibir pasta aberta, pasta fechada ou documento
						new go.Binding("source", "isTreeExpanded", imageConverter).ofObject(),
						new go.Binding("source", "isTreeLeaf", imageConverter).ofObject()),

					  //Bloco de texto por linha no treeview
					  $(go.TextBlock, 
						{ font: '11pt Verdana, sans-serif',
						  editable: true, // Permite a edição do nome do nó
						  isMultiline: false, // Impede que o nome do nó ultrapasse uma linha
						  textEdited: function(textBlock, previousText, currentText)
						  { save(); } // Salva em banco de dados a alteração feita
						},
						new go.Binding("text", "name").makeTwoWay()
						//									new go.Binding("text", "key", function(s) { return "item " + s; })
					   )
					 )  // fim do painel horizontal - end Horizontal Panel
		 );  // FIM CONFIGURAÇÃO DO TEMPLATE DO NÓ

	// Sem setas de direcionamento
	myDiagram.linkTemplate = $(go.Link);

	// Inserir linhas de identação
	myDiagram.linkTemplate =
		$(go.Link,
		  { selectable: false,
		   routing: go.Link.Orthogonal,
		   fromEndSegmentLength: 4,
		   toEndSegmentLength: 4,
		   fromSpot: new go.Spot(0.001, 1, 7, 0),
		   toSpot: go.Spot.Left },
		  $(go.Shape,
			{ stroke: 'gray', strokeDashArray: [1,2] }
		   )
		 ); //fim linhas identação

	//Menu flutuante para inserir e excluir registros
    myDiagram.nodeTemplate.contextMenu =
      $(go.Adornment, "Vertical",
        $("ContextMenuButton",         
          $(go.TextBlock, "Novo item"),
          {
            click: function(e, obj) {
			  var empkey = obj.part.data.key;
				alert("mostrar empkey");
				alert(empkey);
			  insertNode(empkey);
              }
          }
        ), // FIM Adicionar
        $("ContextMenuButton",
          $(go.TextBlock, "Excluir item"),
          {
            click: function(e, obj) {
              // reparent the subtree to this node's boss, then remove the node
              var node = obj.part.adornedPart;
              if (node !== null) {
                myDiagram.startTransaction("reparent remove");
                var chl = node.findTreeChildrenNodes();
                // iterate through the children and set their parent key to our selected node's parent key
                while(chl.next()) {
                  var emp = chl.value;
                  myDiagram.model.setParentKeyForNodeData(emp.data, node.findTreeParentNode().data.key);
                }
                // and now remove the selected node itself
                var empkey = node.part.data.key;
                deleteNode(empkey);
                myDiagram.model.removeNodeData(node.data);
                myDiagram.commitTransaction("reparent remove");
                save();
              }
            }
          }
        ), // FIM Remover
        $("ContextMenuButton",
          $(go.TextBlock, "Excluir todos os itens"),
          {
            click: function(e, obj) {
              // remove the whole subtree, including the node itself
              var node = obj.part.adornedPart;
              if (node !== null) {
                //remove children
                var chl = node.findTreeChildrenNodes();
                while(chl.next()) {
                  var childkey = chl.value.data.key;
                  deleteNode(childkey);
                }
                //end of remove children
                var empkey = node.part.data.key;
                deleteNode(empkey); // delete the main node
                
                myDiagram.startTransaction("remove dept");
                myDiagram.removeParts(node.findTreeParts());
                myDiagram.commitTransaction("remove dept");
                save();
              }
            }
          }
        ) // FIM Remover tudo
      ); // FIM ContextMenuButton

	// CRIAR O TREEVIEW
	load();
	

	
} // Fim função init()

// Função responsável por montar o Treeview.
function load() {
	
	// Montando o treeview
	myDiagram.model = go.Model.fromJson(document.getElementById("arraynodes_old").value);
	

	//myDiagram.model = go.Model.fromJson(document.getElementById("arraynodes_old").value);
	//document.getElementById( strDivId ).style.backgroundColor = bgcolor;
}

// FUNÇÃO PARA INSERIR NÓ A PARTIR DO MENU FLUTUANTE - contextmenu
function insertNode(empboss = 0) {

	alert("entrou insertnode");
	alert(strAppSave);
	
  $.post( "../"+ strAppSave +"/index.php",
		{ ajaxtp: "insert", empboss: empboss })
		.done(function(response,status){			
			//myDiagram.startTransaction("add example_gojs"); 
			var newemp = { key: response, name: 'Novo item', parent: empboss };
			myDiagram.model.addNodeData(newemp);
			
			alert("fim insertnode");
			//myDiagram.commitTransaction("add example_gojs");
		});
}

function deleteNode(empkey) {      
  $.post( "../"+ strAppSave +"/index.php",
		{ ajaxtp: "delete", empkey: empkey },
		function(response,status){                 
			return response;
		}
	);
}

function save() {
	
	alert("entrou save");
document.getElementById("arraynodes_new").value = myDiagram.model.toJson();

var val1 = $("#arraynodes_old").val();
var val2 = $("#arraynodes_new").val();
	
	alert(val1);
	alert(val2);

	$.post( "../"+ strAppSave +"/index.php",
			{ ajaxtp: "save", arraynodes_old: val1, arraynodes_new: val2 },
			function(response,status){ 
				alert(response);
				return response;
			}
	);
document.getElementById("arraynodes_old").value = myDiagram.model.toJson();    
}









// MONTANDO O ARRAY DO TREEVIEW
function makeTree(node, parentNode, nameNode, numTotItem) {
	var nodeDataArray;	
	var childdata;

	for (var i = 0; i < numTotItem; i++) {
		// inserindo nos filhos
		childdata = { key: node, parent: parentNode, name: nameNode };

		// adicionando o nó filho ao array
		nodeDataArray.push(childdata);
	}
	return count;
}



// toma uma alteração de propriedade em isTreeLeaf ou isTreeExpanded e seleciona a imagem correta para usar
function imageConverter(prop, picture)
{
	var node = picture.part;
	if (node.isTreeLeaf) 
	{
		return "images/document.png";
	} else {
		if (node.isTreeExpanded) 
		{
			return "../_lib/img/grp__NM__ico__NM__add16.png";
		} else {
			return "../_lib/img/grp__NM__ico__NM__remove16.png";
		}
	}
}