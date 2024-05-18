import ora from "ora";

class Spinner {
	private spinner: any;

	constructor() {
		this.spinner = ora();
	}

	updateSpinnerText(message: string) {
		if (this.spinner.isSpinning) {
			this.spinner.text = message;
			return;
		}
		this.spinner.start(message);
	}

	stopSpinner() {
		if (this.spinner.isSpinning) {
			this.spinner.stop();
		}
	}

	spinnerError(message?: string) {
		if (this.spinner.isSpinning) {
			this.spinner.fail(message);
		}
	}

	spinnerSuccess(message?: string) {
		if (this.spinner.isSpinning) {
			this.spinner.succeed(message);
		}
	}

	spinnerInfo(message: string) {
		this.spinner.info(message);
	}
}

export default Spinner;
