import{r as o,j as t,R as d}from"./index-RQRnV040.js";const n={toolbar:[[{header:[1,2,3,!1]}],["bold","italic","underline","strike"],[{color:[]},{background:[]}],[{list:"ordered"},{list:"bullet"}],["link"],["clean"]]},a=["header","bold","italic","underline","strike","color","background","list","link"];function u({value:i,onChange:l,placeholder:s}){const e=o.useRef(null);return o.useEffect(()=>{if(e.current){const r=e.current.getEditor();r==null||r.focus()}},[]),t.jsxs("div",{className:"rich-text-editor",children:[t.jsx(d,{ref:e,theme:"snow",value:i,onChange:l,modules:n,formats:a,placeholder:s,className:"bg-white rounded-lg"}),t.jsx("style",{children:`
        .rich-text-editor .ql-container {
          min-height: 150px;
          font-size: 16px;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f5f5f4;
        }
        .rich-text-editor .ql-editor {
          min-height: 150px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #a3a3a3;
          font-style: normal;
        }
      `})]})}export{u as RichTextEditor};
