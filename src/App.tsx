import React, { useEffect, useState } from "react";
import autobahn from "autobahn";
import logo from "./dappnode-logo-only.png";
import logoAnimation from "./dappNodeAnimation.gif";
import "./App.css";

const url = "ws://my.wamp.dnp.dappnode.eth:8080/ws";
const realm = "dappnode_admin";
const installPackageRoute = "installPackage.dappmanager.dnp.dappnode.eth";
const installPackageKwargsMixed = {
  id: "core.dnp.dappnode.eth",
  name: "core.dnp.dappnode.eth",
  options: { BYPASS_RESOLVER: true }
};
const progressLogEvent = "log.dappmanager.dnp.dappnode.eth";

let session: autobahn.Session;

interface Status {
  updating?: string;
  error?: string;
  success?: boolean;
}

function App() {
  const [status, setStatus] = useState<Status>({});
  const [mixedContentError, setMixedContentError] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  useEffect(() => {
    const connection = new autobahn.Connection({ url, realm });

    connection.onopen = _session => {
      setMixedContentError(false);
      setSessionOpen(true);
      session = _session;
      console.log("CONNECTED to \nurl: " + url + " \nrealm: " + realm);
      // For testing:
      // @ts-ignore
      window.call = (event, kwargs = {}) => _session.call(event, [], kwargs);

      _session.subscribe(progressLogEvent, (_0, { data }) => {
        const log: { name: string; message: string; clear: boolean } = data;
        if (log.clear) setStatus(x => ({ ...x, updating: "" }));
        else
          setStatus(x => ({ ...x, updating: `${log.name}: ${log.message}` }));
      });
    };

    // connection closed, lost or unable to connect
    connection.onclose = (reason, details) => {
      console.error("CONNECTION_CLOSE", { reason, details });
      if (reason === "unsupported") {
        // This error may be caused by mixed-content restrictions
        setMixedContentError(true);
      }
      setSessionOpen(false);
      return false;
    };

    connection.open();
  }, []);

  async function updateCore() {
    if (status.updating) return;

    try {
      setStatus({ updating: "Updating..." });

      if (!session) throw Error("Session is not open");

      const res = await session
        .call(installPackageRoute, [], installPackageKwargsMixed)
        // @ts-ignore
        .then(JSON.parse)
        .catch((e: any) => {
          // crossbar return errors in a specific format
          throw Error(e.message || (e.args && e.args[0] ? e.args[0] : e.error));
        });
      if (!res.success) throw Error(res.message);

      setStatus({ success: true });
    } catch (e) {
      console.error(e);
      setStatus({ error: e.message });
    }
  }

  return (
    <div>
      {mixedContentError && (
        <div className="card">
          <div>
            You must allow mixed content to communicate with your DAppNode's
            HTTP endpoint
          </div>
          <div>
            How to allow mixed content in{" "}
            <a href="https://stackoverflow.com/questions/18321032/how-to-get-chrome-to-allow-mixed-content">
              Chrome
            </a>
            {", "}
            <a href="https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox">
              Firefox
            </a>
            {", "}
            <a href="https://docs.adobe.com/content/help/en/target/using/experiences/vec/troubleshoot-composer/mixed-content.html">
              others
            </a>{" "}
          </div>
        </div>
      )}

      <img
        src={status.updating ? logoAnimation : logo}
        className={`logo ${
          status.error
            ? "error"
            : status.success
            ? "success"
            : status.updating
            ? "updating"
            : ""
        }`}
        alt="logo"
      />

      <p className="title">DAppNode core updater</p>

      {!status.success && (
        <button
          onClick={updateCore}
          disabled={Boolean(status.updating || !sessionOpen)}
        >
          UPDATE
        </button>
      )}

      <div>
        {status.error ? (
          <p className="log error">{status.error}</p>
        ) : status.success ? (
          <p className="log">Successfully updated core</p>
        ) : status.updating ? (
          <p className="log">{status.updating}</p>
        ) : null}
      </div>
    </div>
  );
}

export default App;
