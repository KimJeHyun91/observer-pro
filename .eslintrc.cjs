/* eslint-disable no-undef */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "eslint-config-prettier",
  ],
  plugins: ["react-refresh"],
  settings: {
    react: {
      version: "detect",
    },
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"] // use typescript-eslint parser for .ts|tsx files.
    },
    "import/resolver": {
      typescript: {
        project: "./tsconfig.eslint.json",
        alwaysTryTypes: true // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`.
      }
    }
  },
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ],
    "react/react-in-jsx-scope": "off",
    "import/first": "warn",
    "import/default": "off",
    "import/newline-after-import": "warn",
    "import/no-named-as-default-member": "off",
    "import/no-duplicates": "error",
    "import/no-named-as-default": 0,
    "react/prop-types": "off",
    "react/jsx-sort-props": [
      "warn",
      {
        "callbacksLast": true,
        "shorthandFirst": true,
        "ignoreCase": true,
        "reservedFirst": true,
        "noSortAlphabetically": true
      }
    ],

    /**
     * Three.js + react-three-fiber 사용 시 발생하는 ESLint 경고 방지
     *
     * react-three-fiber에서 사용하는 속성('position', 'rotation', 'scale' 등)은
     * DOM 표준 속성이 아니기 때문에 eslint-plugin-react(no-unknown-property)가
     * 기본적으로 에러를 발생 시킴
     *
     * 아래 속성들은 r3f에서 현재 쓰이는 것만 예외 처리하여
     * 불필요한 경고를 피하고 실제 오타나 잘못된 속성은 계속 잡을 수 있게 하기위해 사용
     * 
     * ※ 참고
     * - 규칙 전체를 끌 수도 있지만 ("react/no-unknown-property": "off")
     * - 그렇게 하면 DOM 속성 오타까지 잡지 못하기 때문에 Three.js 속성만 작성 (비추천)
     * 
     * 추후 다른 r3f 속성에서 에러가 날 경우 아래 ignore 목록에 속성을 추가하면 됩니다.
     */
    "react/no-unknown-property": ["error", {
      ignore: [
        // Transform 관련
        "position", "rotation", "scale",

        // Object/primitive 관련
        "object", "dispose", "attach", "args",

        // Light 관련
        "intensity", "color", "distance", "decay", "angle", "penumbra",

        // Shadow 관련
        "castShadow", "receiveShadow",

        // Material/Geometry 관련
        "geometry", "material", "wireframe",
      ],
    }],
  },
};
