/** @format */

import React, { useEffect, useState } from 'react';

import TripDocument from '../../../../components/pdf/TripDocument';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { AuthContext } from '../../../../contexts/AuthContext';
import TripTeamLayout from '../../../../components/layout/TripTeamLayout';
import PropTypes from 'prop-types';
import Link from 'next/link';
import styles from '../../../../css/pdf.module.css';
import axios from 'axios';
import ReactLoading from 'react-loading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faToolbox, faDownload } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/router';

export default function Pdf(props) {
  const [activities, setActivities] = useState([]);
  const [travels, setTravels] = useState([]);
  const [trip, setTrip] = useState(undefined);
  const [actLoading, setActLoading] = useState(true);
  const [travelLoading, setTravelLoading] = useState(true);
  const [tripLoading, setTripLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
    const tripID = props.tripID;
    const hostName = process.env.API_HOSTNAME;
    axios.defaults.withCredentials = true;
    axios
      .get(`${hostName}/api/trip/${tripID}`)
      .then(
        res => setTrip(res.data),
        err => {
          if (err.response.status === 401) setTrip(undefined);
          else router.push('/');
        },
      )
      .then(() => setTripLoading(false));
    axios
      .get(`${hostName}/api/trip/${tripID}/activities`)
      .then(
        res => setActivities(res.data),
        () => setActivities([]),
      )
      .then(() => {
        setActLoading(false);
      });
    axios
      .get(`${hostName}/api/trip/${tripID}/travels`)
      .then(
        res => setTravels(res.data),
        () => setTravels([]),
      )
      .then(() => {
        setTravelLoading(false);
      });
    setOpen(true);
    return () => setOpen(false);
  }, []);

  return (
    <AuthContext.Consumer>
      {({ currentUser }) => {
        return (
          <TripTeamLayout
            user={currentUser}
            tripID={props.tripID}
            activeLink={'Tools'}
          >
            {currentUser ? (
              actLoading || travelLoading || tripLoading || !open ? (
                <div className={styles.pdfLoading}>
                  <ReactLoading type='spinningBubbles' color='#ff4200' />
                  <p> Generating your trip plan pdf...</p>
                </div>
              ) : (
                <div className={styles.pdfToolContainer}>
                  <div className={styles.optionsContainer}>
                    <span>
                      <Link href={'../tools'}>
                        <a>
                          <FontAwesomeIcon icon={faToolbox} />
                          Back to Tool Box
                        </a>
                      </Link>
                    </span>
                    <span>
                      <FontAwesomeIcon icon={faDownload} />
                      <PDFDownloadLink
                        document={
                          <TripDocument
                            activities={activities}
                            travels={travels}
                            trip={trip}
                          />
                        }
                        fileName='trip-plan.pdf'
                      >
                        {({ loading }) =>
                          loading ? 'Loading document...' : 'Download File'
                        }
                      </PDFDownloadLink>
                    </span>
                  </div>
                  <div>
                    <PDFViewer width={'100%'} height={'100%'}>
                      <TripDocument
                        activities={activities}
                        travels={travels}
                        trip={trip}
                      />
                    </PDFViewer>
                  </div>
                </div>
              )
            ) : (
              <div className={'fit-center'}>
                <Link href={'/login'}>
                  <a> Log in </a>
                </Link>
                to access the trip plan pdf
              </div>
            )}
          </TripTeamLayout>
        );
      }}
    </AuthContext.Consumer>
  );
}

Pdf.getInitialProps = ({ query }) => {
  return { tripID: query.id };
};

Pdf.propTypes = {
  tripID: PropTypes.string.isRequired,
};
