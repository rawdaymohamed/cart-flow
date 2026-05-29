/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				ink: "#07111f",
				panel: "#0d1728",
				panelAlt: "#16233a",
				line: "#22304a",
				lineAlt: "#2f4160",
				accent: "#d4af37",
				accentHover: "#b9912f",
				accentSoft: "#f0d9a3",
				muted: "#cbd5e1",
				mutedAlt: "#94a3b8",
				surface: "#0b1424",
			},
		},
	},
	plugins: [],
};
