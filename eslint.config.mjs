import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
	{
		ignores: [".venv/**", "backend/**", "node_modules/**", ".next/**"]
	},
	...nextVitals
];

export default eslintConfig;
