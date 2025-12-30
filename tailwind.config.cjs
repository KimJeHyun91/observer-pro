/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */

module.exports = {
	mode: 'jit',
	content:  [
		"./index.html",
    	"./src/**/*.{js,ts,jsx,tsx}", 
		'./safelist.txt'
	],
	darkMode: 'class',
		theme: {
			fontFamily: {
				sans: [
					'Inter',
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'Roboto',
					'"Helvetica Neue"',
					'Arial',
					'"Noto Sans"',
					'sans-serif',
					'"Apple Color Emoji"',
					'"Segoe UI Emoji"',
					'"Segoe UI Symbol"',
					'"Noto Color Emoji"',
				],
				serif: [
					'ui-serif',
					'Georgia',
					'Cambria',
					'"Times New Roman"',
					'Times',
					'serif',
				],
				mono: [
					'ui-monospace',
					'SFMono-Regular',
					'Menlo',
					'Monaco',
					'Consolas',
					'"Liberation Mono"',
					'"Courier New"',
					'monospace',
				],
			},
			screens: {
				xs: '576px',
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1536px',
			},
			extend: {
				colors: {
					'primary': 'var(--primary)',
					'primary-deep': 'var(--primary-deep)',
					'primary-mild': 'var(--primary-mild)',
					'primary-subtle': 'var(--primary-subtle)',
					'error': 'var(--error)',
					'error-subtle': 'var(--error-subtle)',
					'success': 'var(--success)',
					'success-subtle': 'var(--success-subtle)',
					'info': 'var(--info)',
					'info-subtle': 'var(--info-subtle)',
					'warning': 'var(--warning)',
					'warning-subtle': 'var(--warning-subtle)',
					'neutral': 'var(--neutral)',
					'gray-50': 'var(--gray-50)',
					'gray-100': 'var(--gray-100)',
					'gray-200': 'var(--gray-200)',
					'gray-300': 'var(--gray-300)',
					'gray-400': 'var(--gray-400)',
					'gray-500': 'var(--gray-500)',
					'gray-600': 'var(--gray-600)',
					'gray-700': 'var(--gray-700)',
					'gray-800': 'var(--gray-800)',
					'gray-900': 'var(--gray-900)',
					'gray-950': 'var(--gray-950)',
					'active-menu': 'var(--active-menu)',
					'inactive-menu': 'var(--inactive-menu)',
					'active-menu_bg': 'var(--active-menu_bg)',
					'inactive-menu_bg': 'var(--inactive-menu_bg)',
					'menu-box': 'var(--menu-box)'
				},
				keyframes: {
				// 	blink: {
				// 		'30%, 100%': { opacity: 1 },
				// 		'50%': { opacity: 0 },
				// 	 },
				//   },
				//   animation: {
				// 	 blink: 'blink 2s infinite',
				//   },
					blinkBorder: {
						'0%, 100%': { borderColor: 'transparent' },
						'50%': { borderColor: 'red' },
					},
				},
				animation: {
					blinkBorder: 'blinkBorder 1s infinite',
				},
				typography: (theme) => ({
					DEFAULT: {
						css: {
							color: theme('colors.gray.500'),
							maxWidth: '65ch',
						},
					},
					invert: {
						css: {
							color: theme('colors.gray.400'),
						},
					},
				}),
			},
		},
	plugins: [
        require('@tailwindcss/typography'),
	],
};
