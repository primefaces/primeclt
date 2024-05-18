import inquirer from "inquirer";

const themes = [
	{
		color: "amber"
	},
	{
		color: "blue"
	},
	{
		color: "cyan"
	},
	{
		color: "green"
	},
	{
		color: "indigo"
	},
	{
		color: "pink"
	},
	{
		color: "purple"
	},
	{
		color: "teal"
	}
];

const pickStyledTheme = async () => {
	const styledAnswer = await inquirer.prompt([
		{
			type: "list",
			name: "style",
			message: "Pick your path.",
			choices: [
				{
					name: "Styled",
					value: "styled"
				},
				{
					name: "Styled QuickStart",
					value: "styled-quickstart"
				},
				{
					name: "Unstyled",
					value: "unstyled"
				}
			]
		}
	]);

	return styledAnswer.style;

	// Can be used when themes are added
	// if (styledAnswer.style === "unstyled") {
	// 	return "unstyled";
	// }

	// const themeAnswers = await inquirer.prompt([
	// 	{
	// 		type: "list",
	// 		name: "darkTheme",
	// 		message: "Pick your side.",
	// 		choices: [
	// 			{
	// 				name: "Light",
	// 				value: false
	// 			},
	// 			{
	// 				name: "Dark",
	// 				value: true
	// 			}
	// 		]
	// 	},
	// 	{
	// 		type: "list",
	// 		name: "theme",
	// 		message: "Pick a Lara Theme",
	// 		choices: themes.map((theme) => ({
	// 			name: theme.color,
	// 			value: theme.color
	// 		}))
	// 	}
	// ]);

	// return `lara-${themeAnswers.darkTheme ? "dark" : "light"}-${
	// 	themeAnswers.theme
	// }`;
};

const pickPrimeIcons = async () => {
	const answers = await inquirer.prompt([
		{
			type: "confirm",
			name: "installPrimeIcons",
			message: "Do you want to install PrimeIcons?"
		}
	]);

	return answers.installPrimeIcons;
};

export { pickStyledTheme, pickPrimeIcons };
