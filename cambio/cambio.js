// Cambio
// Auteur : Corentin ROBIN - corentin.robin@gmail.com
// Version : 25 mai 2022
// On met à jour les attributs et les noeuds texte en remplaçant les valeurs entre {{ accolades }}

var Cambio = 
{
    activeElement : null,
    renderingTime: 0,

    isActiveElement : function(element)
    {
        return Cambio.activeElement == element;
    },

    replaceMacros : function(string)
    {
        return string.replace(/\{\{ *(.*?) *\}\}/g, 
            function(match, capture)
            {
                try
                {
                    return eval(capture);
                }

                catch(error)
                {
                    return error;
                }
            });
    },

    initialise : function()
    {
        var elements = document.body.querySelectorAll("input,select,textarea,label,[\\:items]");

        elements.forEach(function(element)
        {
            // on force le focus pour être sûr que c'est bien l'activeElement
            element.addEventListener("mousedown", function()
            {
                if(this.tagName == "LABEL")
                {
                    var targetElement = document.getElementById(this.getAttribute("for"));

                    if(targetElement) Cambio.activeElement = targetElement;
                }

                else Cambio.activeElement = this;
            });
        });
    },

    render : function()
    {
        var t0 = performance.now();

        // MISE À JOUR DES VARIABLES DYNAMIQUES

        for(variable in window)
        {
            if(variable.indexOf("$cambio_") == 0)
            {
                var targetVariable = variable.split("_")[1];

                try
                {
                    window[targetVariable] = eval(window[variable]);
                }

                catch(error)
                {
                    window[targetVariable] = error;
                }
            }
        }
        
        var elements = document.querySelectorAll("title, body *");
    
        elements.forEach(function(element)
        {
            var attributes = element.attributes, i;

            if(element.tagName.indexOf("CAMBIO-") == 0)
            {
                var name = element.tagName.split(/-/g)[1].toLowerCase();

                if(!element.hasOwnProperty("calculatedContent")) element.calculatedContent = null;

                var object = window[element.getAttribute(":object")];

                var calculatedContent = window["$cambio__" + name];

                calculatedContent = calculatedContent.replace(/\{\{\{ *(.*?) *\}\}\}/g, 
                    function(match, capture)
                    {
                        return object[capture];
                    });

                if(element.calculatedContent != calculatedContent)
                {
                    element.innerHTML = calculatedContent;
                    element.calculatedContent = calculatedContent;
                }
            }

            // REMPLACEMENT DES ATTRIBUTS
    
            for(i = 0; i < attributes.length; i++)
            {
                var attribute = attributes[i];
    
                switch(attribute.name)
                {
                    case ":variable":
                        if(element.type != "file")
                        {
                            if(element.type == "radio")
                            {
                                var variableName = element.getAttribute(attribute.name);
        
                                if(Cambio.isActiveElement(element)) window[variableName] = element.value;
        
                                else
                                {
                                    var radios = document.querySelectorAll("[name='" + element.name + "']");
        
                                    radios.forEach(function(radio)
                                    {
                                        if(radio.value == window[variableName]) radio.checked = true;
                                        else radio.checked = false;
                                    });
                                }
                            }
        
                            else
                            {
                                var valueProperty = element.type == "checkbox" ? "checked" : "value";
        
                                // si l'élément est actif, on met à jour la variable
                                if(Cambio.isActiveElement(element))
                                {
                                    if(element.type == "number" || element.type == "range" || element.type == "checkbox")
                                        eval(element.getAttribute(attribute.name) + " = " + element[valueProperty]);
        
                                    else
                                        eval(element.getAttribute(attribute.name) + " = `" + element[valueProperty] + "`");
                                }
        
                                // sinon on met à jour l'élément
                                else element[valueProperty] = eval(element.getAttribute(attribute.name));
                            }
                        }
                        break;

                    case ":items":
                        switch(element.tagName)
                        {
                            case "SELECT":
                                var __items = eval(element.getAttribute(":items"));

                                if(!element.hasOwnProperty("calculatedContent")) element.calculatedContent = null;

                                var calculatedContent = "";

                                for(var i = 0; i < __items.length; i++)
                                {
                                    var __item = __items[i];

                                    calculatedContent += '<option value="' + Object.keys(__item)[0] + '">' + __item[Object.keys(__item)[0]] + '</option>';
                                }

                                if(element.calculatedContent != calculatedContent)
                                {
                                    element.innerHTML = calculatedContent;
                                    element.calculatedContent = calculatedContent;
                                }
                                break;

                            case "UL":
                                var __items = eval(element.getAttribute(":items"));

                                if(!element.hasOwnProperty("calculatedContent")) element.calculatedContent = null;

                                var calculatedContent = "";

                                for(var i = 0; i < __items.length; i++)
                                {
                                    calculatedContent += '<li>' + __items[i] + '</li>';
                                }

                                if(element.calculatedContent != calculatedContent)
                                {
                                    element.innerHTML = calculatedContent;
                                    element.calculatedContent = calculatedContent;
                                }
                                break;

                            default:
                                break;
                        }
                        break;
    
                    default:
                        if(attribute.name[0] != ":")
                        {
                            // mettre à jour l'élément option sur Firefox cause un "grésillement" dans l'élément select (semble constamment remis à zéro dans le DOM...)
                            if(element.tagName != "OPTION")
                            {
                                var templateProperty = "templateFor" + attribute.name;
    
                                if(!element.hasOwnProperty(templateProperty)) element[templateProperty] = attribute.value;
            
                                var attributeValue = Cambio.replaceMacros(element[templateProperty]);
            
                                element.setAttribute(attribute.name, attributeValue);
                            }
                        }
                        break;
    
                }
            }
    
            // REMPLACEMENT DES NOEUDS TEXTE
    
            element.childNodes.forEach(function(node)
            {
                if(node.nodeType == Node.TEXT_NODE)
                {
                    // on conserve le texte d'origine pour reconstruire le nouveau texte si les valeurs ont changé
                    if(!node.hasOwnProperty("nodeTemplate")) node.nodeTemplate = node.nodeValue;
    
                    var proposedContent = Cambio.replaceMacros(node.nodeTemplate);
    
                    // on ne met à jour le texte qui s'il a changé
                    if(node.nodeValue != proposedContent) node.nodeValue = proposedContent;
                }
            });
        });

        Cambio.renderingTime = performance.now() - t0;
    
        window.requestAnimationFrame(Cambio.render);
    }
}

window.addEventListener("load", function()
{
    Cambio.initialise();
    Cambio.render();
})